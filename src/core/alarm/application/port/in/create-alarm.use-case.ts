import { Alarm } from '@core/alarm/domain/alarm';
import { CreateAlarmCommand } from './command/create-alarm.command';

export const CREATE_ALARM_USE_CASE = Symbol('CreateAlarmUseCase');

export interface CreateAlarmUseCase {
    execute(command: CreateAlarmCommand): Promise<Alarm>;
}
