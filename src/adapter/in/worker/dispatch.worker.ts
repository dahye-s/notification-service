import { DeliveryDispatcher } from '@adapter/in/worker/delivery-dispatcher';
import { RecipientLoader } from '@adapter/in/worker/recipient-loader';
import { StatsCollector } from '@adapter/in/worker/stats-collector';
import { UnknownReconciler } from '@adapter/in/worker/unknown-reconciler';
import { ALARM_PORT, type AlarmPort } from '@core/alarm/application/port/out/alarm.port';
import { DELIVERY_PORT, type DeliveryPort } from '@core/alarm/application/port/out/delivery.port';
import { workerConfig } from '@global/config/worker.config';
import { Inject, Injectable, Logger } from '@nestjs/common';

/** 워커 루프. 적재·발송·집계는 각 컴포넌트에 위임한다 */
@Injectable()
export class DispatchWorker {
    private readonly logger = new Logger(DispatchWorker.name);

    /** SIGTERM을 받으면 false가 되어 새 클레임을 멈춘다 */
    private running = false;

    constructor(
        @Inject(DELIVERY_PORT) private readonly deliveryPort: DeliveryPort,
        @Inject(ALARM_PORT) private readonly alarmPort: AlarmPort,
        private readonly recipientLoader: RecipientLoader,
        private readonly dispatcher: DeliveryDispatcher,
        private readonly statsCollector: StatsCollector,
        private readonly reconciler: UnknownReconciler,
    ) {}

    async run(): Promise<void> {
        this.running = true;
        this.logger.log(`[${workerConfig.workerId}] started`);

        while (this.running) {
            try {
                // 1. 적재할 알림이 있으면 먼저 처리한다.
                //    수신자가 없으면 발송할 것도 없으므로 적재가 우선이다
                const prepared = await this.recipientLoader.loadNext();
                if (prepared) continue;

                // 2. 발송 건 점유.
                //    PENDING과 lease 만료된 IN_FLIGHT를 함께 가져오며 긴급 건이 앞선다
                const batch = await this.deliveryPort.claim(
                    workerConfig.workerId,
                    workerConfig.claimBatchSize,
                    workerConfig.claimLeaseSec,
                );

                if (batch.length > 0) {
                    // 3. 발송 후 통계 반영
                    const results = await this.dispatcher.dispatchBatch(batch);
                    await this.statsCollector.apply(results);
                    continue;
                }

                // 4. 보낼 것이 없을 때 미확정 건을 조회로 확정한다.
                //    발송이 밀려 있는 동안에는 발송이 우선이다
                const reconciled = await this.reconciler.reconcileNext();
                if (reconciled) continue;

                // 5. 남은 건이 없는 알림을 완료로 넘긴다
                const completed = await this.alarmPort.completeFinished();
                if (completed > 0) {
                    this.logger.log(`[${workerConfig.workerId}] completed ${completed} alarm(s)`);
                    continue;
                }

                await sleep(workerConfig.pollIntervalMs);
            } catch (e) {
                // 루프가 죽으면 워커가 멈추므로 어떤 오류든 삼키고 계속 돈다.
                // 점유한 건은 lease가 만료되면 다른 워커가 회수한다
                this.logger.error(`loop error: ${String(e)}`);
                await sleep(workerConfig.pollIntervalMs);
            }
        }

        this.logger.log(`[${workerConfig.workerId}] stopped`);
    }

    /** 새 클레임을 멈추고 진행 중인 발송만 마무리한다 */
    async shutdown(): Promise<void> {
        this.logger.log(`[${workerConfig.workerId}] draining...`);
        this.running = false;

        while (this.dispatcher.pending > 0) {
            await sleep(100);
        }
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
