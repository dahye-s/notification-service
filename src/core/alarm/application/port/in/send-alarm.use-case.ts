import { Alarm } from '@core/alarm/domain/alarm';
import { SendAlarmCommand } from './command/send-alarm.command';

export const SEND_ALARM_USE_CASE = Symbol('SendAlarmUseCase');

export interface SendAlarmUseCase {
    execute(command: SendAlarmCommand): Promise<Alarm>;
}
