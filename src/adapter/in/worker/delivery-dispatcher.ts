import type { DispatchResult } from '@adapter/in/worker/stats-collector';
import { DELIVERY_PORT, type DeliveryPort } from '@core/alarm/application/port/out/delivery.port';
import {
    RATE_LIMIT_PORT,
    type RateLimitPort,
} from '@core/alarm/application/port/out/rate-limit.port';
import { SENDER_PORT, type SenderPort } from '@core/alarm/application/port/out/sender.port';
import type { ClaimedDelivery } from '@core/alarm/application/port/out/type/delivery.type';
import { SendResultType, type SendResult } from '@core/alarm/application/port/out/type/sender.type';
import { DeliveryStatus } from '@core/alarm/domain/delivery-status';
import { calculateBackoffMs, isRetryExhausted } from '@core/alarm/domain/retry-policy';
import { workerConfig } from '@global/config/worker.config';
import { Inject, Injectable } from '@nestjs/common';

/** 발송 요청과 결과 기록을 담당한다. 루프 제어는 DispatchWorker가 한다 */
@Injectable()
export class DeliveryDispatcher {
    /** 종료 시 진행 중인 발송이 끝날 때까지 기다리기 위한 카운터 */
    private inFlight = 0;

    constructor(
        @Inject(DELIVERY_PORT) private readonly deliveryPort: DeliveryPort,
        @Inject(SENDER_PORT) private readonly sender: SenderPort,
        @Inject(RATE_LIMIT_PORT) private readonly rateLimit: RateLimitPort,
    ) {}

    get pending(): number {
        return this.inFlight;
    }

    /**
     * 동시성 상한을 유지하며 발송한다.
     *
     * 배치를 조각내 Promise.all로 돌리면 조각마다 가장 느린 응답(타임아웃 5초)을
     * 기다리느라 그동안 아무것도 보내지 못한다. 한 건이 끝나는 즉시 다음 건을
     * 투입해야 대기 시간이 처리량을 깎지 않는다.
     *
     * 상한을 두는 이유는 장애 시 결과를 모르는 건수를 묶어두기 위함이다.
     */
    async dispatchBatch(batch: ClaimedDelivery[]): Promise<DispatchResult[]> {
        const results: DispatchResult[] = [];
        let cursor = 0;

        const runner = async (): Promise<void> => {
            for (let i = cursor++; i < batch.length; i = cursor++) {
                results.push(await this.dispatchOne(batch[i]));
            }
        };

        const lanes = Math.min(workerConfig.maxInFlight, batch.length);
        await Promise.all(Array.from({ length: lanes }, runner));

        return results;
    }

    private async dispatchOne(delivery: ClaimedDelivery): Promise<DispatchResult> {
        this.inFlight += 1;

        try {
            // lease 만료로 회수된 건은 이전 워커가 이미 보냈을 수 있다.
            // 재발송하면 중복이 되므로 UNKNOWN으로 두고 조회로 확정한다
            if (delivery.recovered) {
                await this.deliveryPort.updateResult(delivery.id, delivery.leaseToken, {
                    status: DeliveryStatus.UNKNOWN,
                    lastError: 'recovered from expired lease',
                });
                return { alarmId: delivery.alarmId, status: DeliveryStatus.UNKNOWN };
            }

            // 워커 수와 무관하게 전역 한도를 지킨다
            await this.rateLimit.acquire();

            const result = await this.sender.send({
                alarmId: delivery.alarmId,
                recipientId: delivery.recipientId,
                body: delivery.body,
                clientRef: delivery.clientRef,
            });

            const status = await this.applyResult(delivery, result);
            return { alarmId: delivery.alarmId, status };
        } finally {
            this.inFlight -= 1;
        }
    }

    /** 발송 결과를 상태 전이로 옮긴다 */
    private async applyResult(
        delivery: ClaimedDelivery,
        result: SendResult,
    ): Promise<DeliveryStatus> {
        switch (result.type) {
            case SendResultType.SENT:
                await this.deliveryPort.updateResult(delivery.id, delivery.leaseToken, {
                    status: DeliveryStatus.SENT,
                    messageId: result.messageId,
                });
                return DeliveryStatus.SENT;

            case SendResultType.PERMANENT_FAILURE:
                // 수신 거부 등은 다시 보내도 같은 결과다.
                // 재시도하면 초당 한도만 소모하므로 바로 확정한다
                await this.deliveryPort.updateResult(delivery.id, delivery.leaseToken, {
                    status: DeliveryStatus.FAILED,
                    lastError: result.error,
                });
                return DeliveryStatus.FAILED;

            case SendResultType.RATE_LIMITED:
                // 한 워커가 받은 429는 전체가 한도를 넘었다는 뜻이다.
                // 그 워커만 쉬면 나머지가 계속 때려 429가 이어진다
                await this.rateLimit.pauseFor(result.retryAfterMs);
                return this.scheduleRetry(delivery, '429 rate limited', result.retryAfterMs);

            case SendResultType.RETRYABLE:
                // 5xx는 일시적이므로 지수 백오프 후 다시 시도한다
                return this.scheduleRetry(
                    delivery,
                    result.error,
                    calculateBackoffMs(
                        delivery.attempts,
                        workerConfig.backoffBaseMs,
                        workerConfig.backoffMaxMs,
                    ),
                );

            case SendResultType.UNKNOWN:
                // 타임아웃. 외부에는 발송이 처리됐을 수 있어 재발송하면 중복이 된다.
                // clientRef 조회로 확정하기 전까지 보류한다
                await this.deliveryPort.updateResult(delivery.id, delivery.leaseToken, {
                    status: DeliveryStatus.UNKNOWN,
                    lastError: result.error,
                });
                return DeliveryStatus.UNKNOWN;
        }
    }

    /** 재시도 예약. 한도를 넘으면 영구 실패로 확정한다 */
    private async scheduleRetry(
        delivery: ClaimedDelivery,
        error: string,
        delayMs: number,
    ): Promise<DeliveryStatus> {
        if (isRetryExhausted(delivery.attempts, workerConfig.maxAttempts)) {
            await this.deliveryPort.updateResult(delivery.id, delivery.leaseToken, {
                status: DeliveryStatus.FAILED,
                lastError: `max attempts exceeded: ${error}`,
            });
            return DeliveryStatus.FAILED;
        }

        // nextAttemptAt을 미래로 밀면 그 시각 전까지 클레임 대상에서 빠진다
        await this.deliveryPort.updateResult(delivery.id, delivery.leaseToken, {
            status: DeliveryStatus.PENDING,
            lastError: error,
            nextAttemptAt: new Date(Date.now() + delayMs),
        });
        return DeliveryStatus.PENDING;
    }
}
