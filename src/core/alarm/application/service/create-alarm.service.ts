import { Inject, Injectable } from '@nestjs/common';
import { CreateAlarmCommand } from '@core/alarm/application/port/in/command/create-alarm.command';
import { CreateAlarmUseCase } from '@core/alarm/application/port/in/create-alarm.use-case';
import { ALARM_PORT, type AlarmPort } from '@core/alarm/application/port/out/alarm.port';
import { DELIVERY_PORT, type DeliveryPort } from '@core/alarm/application/port/out/delivery.port';
import { Alarm } from '@core/alarm/domain/alarm';
import { validateRecipients } from '@core/alarm/domain/alarm-policy';
import { AlarmType } from '@core/alarm/domain/alarm-type';
import { DeliveryPriority } from '@core/alarm/domain/delivery-status';
import { TRANSACTION_PORT, type TransactionPort } from '@core/shared/port/transaction.port';

@Injectable()
export class CreateAlarmService implements CreateAlarmUseCase {
    constructor(
        @Inject(ALARM_PORT) private readonly alarmPort: AlarmPort,
        @Inject(DELIVERY_PORT) private readonly deliveryPort: DeliveryPort,
        @Inject(TRANSACTION_PORT) private readonly transaction: TransactionPort,
    ) {}

    async execute(command: CreateAlarmCommand): Promise<Alarm> {
        // 1. 수신자 지정 규칙 검증
        validateRecipients(command.type, command.recipientIds);

        return this.transaction.run(async () => {
            // 알림 저장
            const alarm = await this.alarmPort.save({
                type: command.type,
                title: command.title,
                body: command.body,
                totalCount: command.recipientIds?.length ?? 0,
            });

            // 3. 긴급 알림은 수신자가 확정되어 있으므로 생성 시점에 적재한다.
            // 일반 알림은 발송 시작 후 워커가 외부에서 조회해 적재한다.
            if (command.type === AlarmType.URGENT && command.recipientIds) {
                await this.deliveryPort.create(
                    alarm.id,
                    command.recipientIds,
                    DeliveryPriority.URGENT,
                );
            }

            return alarm;
        });
    }
}
