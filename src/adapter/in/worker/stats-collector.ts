import { ALARM_PORT, type AlarmPort } from '@core/alarm/application/port/out/alarm.port';
import { DeliveryStatus } from '@core/alarm/domain/delivery-status';
import { workerConfig } from '@global/config/worker.config';
import { Inject, Injectable, Logger } from '@nestjs/common';

export interface DispatchResult {
    alarmId: string;
    status: DeliveryStatus;
}

/** 발송 진행 로그 간격 */
const LOG_EVERY = 1000;

/**
 * 발송 결과를 알림별로 모아 통계 컬럼에 반영한다.
 * 건별로 갱신하면 UPDATE가 배치 크기만큼 발생한다.
 */
@Injectable()
export class StatsCollector {
    private readonly logger = new Logger(StatsCollector.name);

    /** 건별로 찍으면 10만 줄이 되므로 누적으로 센다 */
    private processed = 0;
    private nextLogAt = LOG_EVERY;

    constructor(@Inject(ALARM_PORT) private readonly alarmPort: AlarmPort) {}

    async apply(results: DispatchResult[]): Promise<void> {
        const byAlarm = new Map<string, { sent: number; failed: number; unknown: number }>();

        for (const { alarmId, status } of results) {
            const stats = byAlarm.get(alarmId) ?? { sent: 0, failed: 0, unknown: 0 };

            if (status === DeliveryStatus.SENT) stats.sent += 1;
            else if (status === DeliveryStatus.FAILED) stats.failed += 1;
            else if (status === DeliveryStatus.UNKNOWN) stats.unknown += 1;

            byAlarm.set(alarmId, stats);
        }

        for (const [alarmId, delta] of byAlarm) {
            await this.alarmPort.updateStats(alarmId, delta);
        }

        this.processed += results.length;

        if (this.processed >= this.nextLogAt) {
            this.logger.log(`[${workerConfig.workerId}] 발송 ${this.processed}건 처리`);
            this.nextLogAt += LOG_EVERY;
        }
    }
}
