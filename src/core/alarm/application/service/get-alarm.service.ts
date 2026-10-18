import { Inject, Injectable } from '@nestjs/common';
import { GetAlarmUseCase } from '@core/alarm/application/port/in/get-alarm.use-case';
import { GetAlarmResult } from '@core/alarm/application/port/in/result/get-alarm.result';
import { ALARM_PORT, type AlarmPort } from '@core/alarm/application/port/out/alarm.port';
import { DELIVERY_PORT, type DeliveryPort } from '@core/alarm/application/port/out/delivery.port';
import { AlarmNotFoundError } from '@core/shared/error/domain-error';

@Injectable()
export class GetAlarmService implements GetAlarmUseCase {
    constructor(
        @Inject(ALARM_PORT) private readonly alarmPort: AlarmPort,
        @Inject(DELIVERY_PORT) private readonly deliveryPort: DeliveryPort,
    ) {}

    async execute(alarmId: string): Promise<GetAlarmResult> {
        // 1. 알림 존재 조회
        const alarm = await this.alarmPort.findById(alarmId);
        if (!alarm) throw new AlarmNotFoundError(alarmId);

        // 2. 발송 진행률 집계 (단건 조회에서만 상세 상태를 제공.)
        const stats = await this.deliveryPort.countByStatus(alarmId);
        return { alarm, stats };
    }
}
