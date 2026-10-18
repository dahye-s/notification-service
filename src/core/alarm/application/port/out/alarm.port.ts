import { Alarm } from '@core/alarm/domain/alarm';
import { GetAlarmListResult } from '../in/result/get-alarm-list.result';
import { GetAlarmListCommand } from '../in/command/get-alarm-list.command';
import { AlarmStatus } from '@core/alarm/domain/alarm-status';
import { StatsDelta } from './type/alarm.type';

export const ALARM_PORT = Symbol('AlarmPort');

/**
 * 일반적인 CRUD 저장소가 아니라, 도메인이 필요로 하는 원자적 연산을 노출한다.
 * 동시성이 필요한 상태 변경은 전부 UPDATE로 구현된다.
 */
export interface AlarmPort {
    // 알림
    save(alarm: Partial<Alarm>): Promise<Alarm>;

    findById(id: string): Promise<Alarm | null>;

    findList(command: GetAlarmListCommand): Promise<GetAlarmListResult>;

    /** 조건부 전이. 영향받은 행이 1이면 true */
    updateStatus(
        id: string,
        from: readonly AlarmStatus[],
        to: AlarmStatus,
        patch?: { startedAt?: Date; finishedAt?: Date; totalCount?: number },
    ): Promise<boolean>;

    /** 증가분만큼 카운트를 올린다. (동시 갱신 안전) */
    updateStats(alarmId: string, delta: StatsDelta): Promise<void>;

    /** 적재할 알림을 한 워커만 선점 */
    claimForPreparing(): Promise<Alarm | null>;

    /** 미확정 건이 남지 않은 SENDING 알림을 COMPLETED로 전이한다. 전이된 알림 수를 돌려준다 */
    completeFinished(): Promise<number>;
}
