import { ALARM_PORT, type AlarmPort } from '@core/alarm/application/port/out/alarm.port';
import { DELIVERY_PORT, type DeliveryPort } from '@core/alarm/application/port/out/delivery.port';
import { USER_PORT, type UserPort } from '@core/alarm/application/port/out/user.port';
import { AlarmStatus } from '@core/alarm/domain/alarm-status';
import { DeliveryPriority } from '@core/alarm/domain/delivery-status';
import { workerConfig } from '@global/config/worker.config';
import { Inject, Injectable, Logger } from '@nestjs/common';

/** 적재 진행 로그 간격 */
const LOG_EVERY = 10_000;

/**
 * PREPARING 알림의 수신자를 외부에서 조회해 적재한다.
 *
 * 10만 명 조회에 수십 초가 걸리므로 API 요청 안에서 처리할 수 없다.
 * 적재가 끝나야 SENDING으로 전이되어 발송 대상이 된다.
 */
@Injectable()
export class RecipientLoader {
    private readonly logger = new Logger(RecipientLoader.name);

    constructor(
        @Inject(ALARM_PORT) private readonly alarmPort: AlarmPort,
        @Inject(DELIVERY_PORT) private readonly deliveryPort: DeliveryPort,
        @Inject(USER_PORT) private readonly userPort: UserPort,
    ) {}

    /** @returns 적재할 알림이 있어 처리했으면 true */
    async loadNext(): Promise<boolean> {
        const alarm = await this.alarmPort.claimForPreparing();
        if (!alarm) return false;

        this.logger.log(`[${workerConfig.workerId}] preparing alarm ${alarm.id}`);

        const total = await this.loadAllRecipients(alarm.id);

        await this.alarmPort.updateStatus(alarm.id, [AlarmStatus.PREPARING], AlarmStatus.SENDING, {
            totalCount: total,
        });

        this.logger.log(`[${workerConfig.workerId}] prepared ${total} recipients`);
        return true;
    }

    /** 커서가 null이 될 때까지 순회한다 (10만 명 기준 약 100회) */
    private async loadAllRecipients(alarmId: string): Promise<number> {
        let cursor: string | null = null;
        let total = 0;
        let nextLogAt = LOG_EVERY;

        do {
            const page = await this.userPort.fetchPage(cursor, workerConfig.userPageSize);

            if (page.users.length > 0) {
                // 중복 적재는 ON CONFLICT DO NOTHING이 막으므로 재실행에 안전하다
                await this.deliveryPort.create(
                    alarmId,
                    page.users.map((u) => u.id),
                    DeliveryPriority.NORMAL,
                );
                total += page.users.length;
            }

            // 10만 건 적재가 수십 초 걸려 중간 진행을 알 수 없다
            if (total >= nextLogAt) {
                this.logger.log(`[${workerConfig.workerId}] 적재 ${total}건`);
                nextLogAt += LOG_EVERY;
            }

            cursor = page.nextCursor;
        } while (cursor);

        return total;
    }
}
