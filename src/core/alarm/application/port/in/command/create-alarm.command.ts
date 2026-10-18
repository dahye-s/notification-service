import { AlarmType } from '@core/alarm/domain/alarm-type';

export interface CreateAlarmCommand {
    type: AlarmType;
    title: string;
    body: string;
    /** URGENT일 때만. 1~100개 */
    recipientIds?: string[];
}
