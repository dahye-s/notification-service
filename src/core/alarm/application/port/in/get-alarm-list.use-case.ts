import { GetAlarmListCommand } from './command/get-alarm-list.command';
import { GetAlarmListResult } from './result/get-alarm-list.result';

export const GET_ALARM_LIST_USE_CASE = Symbol('GetAlarmListUseCase');

export interface GetAlarmListUseCase {
    execute(command: GetAlarmListCommand): Promise<GetAlarmListResult>;
}
