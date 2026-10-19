import { Inject, Injectable } from '@nestjs/common';
import { SendAlarmCommand } from '@core/alarm/application/port/in/command/send-alarm.command';
import { SendAlarmUseCase } from '@core/alarm/application/port/in/send-alarm.use-case';
import { ALARM_PORT, type AlarmPort } from '@core/alarm/application/port/out/alarm.port';
import { Alarm } from '@core/alarm/domain/alarm';
import {
    AlarmStatus,
    canTransitionAlarm,
    SENDABLE_ALARM_STATUSES,
} from '@core/alarm/domain/alarm-status';
import { AlarmType } from '@core/alarm/domain/alarm-type';
import { AlarmNotFoundError, AlarmNotSendableError } from '@core/shared/error/domain-error';

@Injectable()
export class SendAlarmService implements SendAlarmUseCase {
    constructor(@Inject(ALARM_PORT) private readonly alarmPort: AlarmPort) {}

    async execute(command: SendAlarmCommand): Promise<Alarm> {
        // 1. 알림 존재 조회
        const alarm = await this.alarmPort.findById(command.alarmId);
        if (!alarm) throw new AlarmNotFoundError(command.alarmId);

        // 2. 전이할 상태 점검
        //    긴급 알림은 생성 시 수신자가 적재되므로 적재 단계(PREPARING)를 건너뜀.
        const next = alarm.type === AlarmType.URGENT ? AlarmStatus.SENDING : AlarmStatus.PREPARING;

        // 3. 발송 가능 상태 확인(DB 접근 전 빠른 실패)
        if (!canTransitionAlarm(alarm.status, next)) {
            throw new AlarmNotSendableError(alarm.status, SENDABLE_ALARM_STATUSES);
        }

        const startedAt = new Date();

        // 동시 요청에서 한 쪽만 성공시키기 위해 조건부 UPDATE로 처리한다
        const updated = await this.alarmPort.updateStatus(
            command.alarmId,
            SENDABLE_ALARM_STATUSES,
            next,
            { startedAt },
        );

        if (!updated) {
            throw new AlarmNotSendableError(alarm.status, SENDABLE_ALARM_STATUSES);
        }

        return { ...alarm, status: next, startedAt };
    }
}
