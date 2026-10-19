import { Inject, Injectable } from '@nestjs/common';
import { GetAlarmListCommand } from '@core/alarm/application/port/in/command/get-alarm-list.command';
import { GetAlarmListUseCase } from '@core/alarm/application/port/in/get-alarm-list.use-case';
import { GetAlarmListResult } from '@core/alarm/application/port/in/result/get-alarm-list.result';
import { ALARM_PORT, type AlarmPort } from '@core/alarm/application/port/out/alarm.port';

@Injectable()
export class GetAlarmListService implements GetAlarmListUseCase {
    constructor(@Inject(ALARM_PORT) private readonly alarmPort: AlarmPort) {}

    async execute(command: GetAlarmListCommand): Promise<GetAlarmListResult> {
        return this.alarmPort.findList(command);
    }
}
