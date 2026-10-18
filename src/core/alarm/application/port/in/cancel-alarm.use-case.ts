import { CancelAlarmCommand } from './command/cancel-alarm.command';
import { CancelAlarmResult } from './result/cancel-alarm.result';

export const CANCEL_ALARM_USE_CASE = Symbol('CancelAlarmUseCase');

export interface CancelAlarmUseCase {
    execute(command: CancelAlarmCommand): Promise<CancelAlarmResult>;
}
