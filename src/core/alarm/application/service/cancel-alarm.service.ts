import type { CancelAlarmUseCase } from '@core/alarm/application/port/in/cancel-alarm.use-case';
import type { CancelAlarmCommand } from '@core/alarm/application/port/in/command/cancel-alarm.command';
import type { CancelAlarmResult } from '@core/alarm/application/port/in/result/cancel-alarm.result';
import { ALARM_PORT, type AlarmPort } from '@core/alarm/application/port/out/alarm.port';
import { DELIVERY_PORT, type DeliveryPort } from '@core/alarm/application/port/out/delivery.port';
import {
    AlarmStatus,
    CANCELLABLE_ALARM_STATUSES,
    canTransitionAlarm,
} from '@core/alarm/domain/alarm-status';
import { AlarmNotCancellableError, AlarmNotFoundError } from '@core/shared/error/domain-error';
import { TRANSACTION_PORT, type TransactionPort } from '@core/shared/port/transaction.port';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class CancelAlarmService implements CancelAlarmUseCase {
    constructor(
        @Inject(ALARM_PORT) private readonly alarmPort: AlarmPort,
        @Inject(DELIVERY_PORT) private readonly deliveryPort: DeliveryPort,
        @Inject(TRANSACTION_PORT) private readonly transaction: TransactionPort,
    ) {}

    async execute(command: CancelAlarmCommand): Promise<CancelAlarmResult> {
        // 1. 알람 존재 조회
        const alarm = await this.alarmPort.findById(command.alarmId);
        if (!alarm) throw new AlarmNotFoundError(command.alarmId);

        // 2. 취소 가능 상태 확인 (DB 접근 전 빠른 실패)
        if (!canTransitionAlarm(alarm.status, AlarmStatus.CANCELLED)) {
            throw new AlarmNotCancellableError(alarm.status, CANCELLABLE_ALARM_STATUSES);
        }

        const finishedAt = new Date();

        return this.transaction.run(async () => {
            // 3. 알림 상태 변경(조회 이후 상태가 바뀌었을 수 있어 조건부 UPDATE로 재확인)
            const updated = await this.alarmPort.updateStatus(
                command.alarmId,
                CANCELLABLE_ALARM_STATUSES,
                AlarmStatus.CANCELLED,
                { finishedAt },
            );

            if (!updated) {
                throw new AlarmNotCancellableError(alarm.status, CANCELLABLE_ALARM_STATUSES);
            }

            // 4. 미발송 건 취소(IN_FLIGHT는 이미 요청이 나가 회수 불가)
            const cancelledCount = await this.deliveryPort.cancel(command.alarmId);

            return {
                alarm: { ...alarm, status: AlarmStatus.CANCELLED, finishedAt },
                cancelledCount,
            };
        });
    }
}
