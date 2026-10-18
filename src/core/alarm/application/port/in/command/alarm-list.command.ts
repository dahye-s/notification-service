import { AlarmStatus } from '@core/alarm/domain/alarm-status';
import { AlarmType } from '@core/alarm/domain/alarm-type';

export interface GetAlarmListCommand {
    status?: AlarmStatus;
    type?: AlarmType;
    page: number;
    size: number;
}
