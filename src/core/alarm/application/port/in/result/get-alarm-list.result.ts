import { Alarm } from '@core/alarm/domain/alarm';

export interface GetAlarmListResult {
    items: Alarm[];
    total: number;
}
