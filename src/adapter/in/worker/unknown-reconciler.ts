import { ALARM_PORT, type AlarmPort } from '@core/alarm/application/port/out/alarm.port';
import { DELIVERY_PORT, type DeliveryPort } from '@core/alarm/application/port/out/delivery.port';
import { SENDER_PORT, type SenderPort } from '@core/alarm/application/port/out/sender.port';
import type { StatsDelta } from '@core/alarm/application/port/out/type/alarm.type';
import type { ClaimedDelivery } from '@core/alarm/application/port/out/type/delivery.type';
import { DeliveryStatus } from '@core/alarm/domain/delivery-status';
import { workerConfig } from '@global/config/worker.config';
import { Inject, Injectable, Logger } from '@nestjs/common';

/**
 * 발송 여부를 모르는 건을 조회로 확정한다.
 *
 * 타임아웃된 요청도 외부에서는 처리됐을 수 있어 재발송하면 중복이 된다.
 * clientRef는 재시도해도 변하지 않으므로 발송 내역 조회로 실제 여부를 알 수 있다.
 * 이 단계가 없으면 미확정 건이 끝까지 남아 누락을 구분할 수 없다.
 */
@Injectable()
export class UnknownReconciler {
    private readonly logger = new Logger(UnknownReconciler.name);

    constructor(
        @Inject(DELIVERY_PORT) private readonly deliveryPort: DeliveryPort,
        @Inject(ALARM_PORT) private readonly alarmPort: AlarmPort,
        @Inject(SENDER_PORT) private readonly sender: SenderPort,
    ) {}

    /** @returns 확정할 건이 있어 처리했으면 true */
    async reconcileNext(): Promise<boolean> {
        const pending = await this.deliveryPort.find(
            DeliveryStatus.UNKNOWN,
            workerConfig.reconcileBatchSize,
        );

        if (pending.length === 0) return false;

        // 조회 API에는 처리량 제한이 없어 발송 예산을 쓰지 않는다
        const deltas = await Promise.all(pending.map((d) => this.settle(d)));

        await this.applyStats(deltas);

        // 조회가 전부 실패했다면 UNKNOWN이 그대로 남아 있다.
        // 처리했다고 알리면 루프가 같은 건을 쉬지 않고 다시 집는다
        return deltas.some((d) => d.settled);
    }

    private async settle(
        delivery: ClaimedDelivery,
    ): Promise<StatsDelta & { alarmId: string; settled: boolean }> {
        try {
            const records = await this.sender.findByClientRef(delivery.clientRef);
            const sent = records[0];

            if (sent) {
                await this.deliveryPort.settleUnknown(delivery.id, {
                    status: DeliveryStatus.SENT,
                    messageId: sent.messageId,
                });

                return { alarmId: delivery.alarmId, sent: 1, unknown: -1, settled: true };
            }

            // 기록이 없으면 실제로 나가지 않은 것이므로 재발송해도 중복이 아니다
            await this.deliveryPort.settleUnknown(delivery.id, {
                status: DeliveryStatus.PENDING,
                lastError: 'not delivered — requeued after lookup',
                nextAttemptAt: new Date(),
            });

            return { alarmId: delivery.alarmId, unknown: -1, settled: true };
        } catch (e) {
            // 조회 자체가 실패하면 UNKNOWN으로 두고 다음 차례에 다시 시도한다
            this.logger.warn(`lookup failed for ${delivery.clientRef}: ${String(e)}`);
            return { alarmId: delivery.alarmId, settled: false };
        }
    }

    private async applyStats(deltas: (StatsDelta & { alarmId: string })[]): Promise<void> {
        const byAlarm = new Map<string, StatsDelta>();

        for (const { alarmId, sent = 0, unknown = 0 } of deltas) {
            const stats = byAlarm.get(alarmId) ?? { sent: 0, unknown: 0 };

            stats.sent = (stats.sent ?? 0) + sent;
            stats.unknown = (stats.unknown ?? 0) + unknown;
            byAlarm.set(alarmId, stats);
        }

        for (const [alarmId, delta] of byAlarm) {
            await this.alarmPort.updateStats(alarmId, delta);
        }
    }
}
