import { GetAlarmResult } from './result/get-alarm.result';

export const GET_ALARM_USE_CASE = Symbol('GetAlarmUseCase');

export interface GetAlarmUseCase {
    execute(alarmId: string): Promise<GetAlarmResult>;
}
