import type { GetAlarmListCommand } from '@core/alarm/application/port/in/command/get-alarm-list.command';
import type { GetAlarmListResult } from '@core/alarm/application/port/in/result/get-alarm-list.result';
import type { AlarmPort } from '@core/alarm/application/port/out/alarm.port';
import type { StatsDelta } from '@core/alarm/application/port/out/type/alarm.type';
import { Alarm } from '@core/alarm/domain/alarm';
import { AlarmStatus } from '@core/alarm/domain/alarm-status';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, type Repository } from 'typeorm';

@Injectable()
export class AlarmPersistenceAdapter implements AlarmPort {
    constructor(
        @InjectRepository(Alarm)
        private readonly repo: Repository<Alarm>,
    ) {}

    async save(alarm: Partial<Alarm>): Promise<Alarm> {
        return this.repo.save(this.repo.create(alarm));
    }

    async findById(id: string): Promise<Alarm | null> {
        return this.repo.findOne({ where: { id } });
    }

    async findList(command: GetAlarmListCommand): Promise<GetAlarmListResult> {
        const [items, total] = await this.repo.findAndCount({
            where: {
                ...(command.status && { status: command.status }),
                ...(command.type && { type: command.type }),
            },
            order: { createdAt: 'DESC' },
            skip: (command.page - 1) * command.size,
            take: command.size,
        });

        return { items, total };
    }

    /**
     * 조건을 WHERE 절에 넣어 조회와 변경을 한 문장으로 처리한다.
     * 읽고 판단한 뒤 쓰면 그 사이에 다른 요청이 상태를 바꿀 수 있다.
     */
    async updateStatus(
        id: string,
        from: readonly AlarmStatus[],
        to: AlarmStatus,
        patch?: { startedAt?: Date; finishedAt?: Date; totalCount?: number },
    ): Promise<boolean> {
        const result = await this.repo.update(
            { id, status: In([...from]) },
            { status: to, ...patch },
        );

        return result.affected === 1;
    }

    /** 절대값이 아닌 증가분으로 갱신해 동시 갱신에도 값이 유실되지 않게 한다. */
    async updateStats(alarmId: string, delta: StatsDelta): Promise<void> {
        const set: Record<string, () => string> = {};

        if (delta.sent) set.sentCount = () => `sent_count + ${delta.sent}`;
        if (delta.failed) set.failedCount = () => `failed_count + ${delta.failed}`;
        if (delta.unknown) set.unknownCount = () => `unknown_count + ${delta.unknown}`;

        if (Object.keys(set).length === 0) return;

        await this.repo
            .createQueryBuilder()
            .update(Alarm)
            .set(set)
            .where('id = :alarmId', { alarmId })
            .execute();
    }

    /**
     * 적재할 알림을 선점한다.
     * SKIP LOCKED로 동시 조회를 막지만 잠금은 쿼리 종료와 함께 풀린다.
     * 적재가 진행되는 동안은 보호되지 않으므로,
     * 중복 적재는 create()의 ON CONFLICT DO NOTHING으로 방지한다.
     */
    async claimForPreparing(): Promise<Alarm | null> {
        const rows: Partial<Alarm>[] = await this.repo.query(
            `
            UPDATE alarms
            SET updated_at = now()
            WHERE id = (
                SELECT id FROM alarms
                WHERE status = $1
                ORDER BY created_at
                LIMIT 1
                FOR UPDATE SKIP LOCKED
            )
            RETURNING *
            `,
            [AlarmStatus.PREPARING],
        );

        return rows[0] ? this.repo.create(rows[0]) : null;
    }
}
