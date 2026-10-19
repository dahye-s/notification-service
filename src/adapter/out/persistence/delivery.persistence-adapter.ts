import { toRows } from '@adapter/out/persistence/raw-rows';
import type { DeliveryPort } from '@core/alarm/application/port/out/delivery.port';
import type {
    ClaimedDelivery,
    DeliveryResult,
    DeliveryStats,
} from '@core/alarm/application/port/out/type/delivery.type';
import { AlarmDelivery } from '@core/alarm/domain/alarm-delivery';
import { AlarmStatus } from '@core/alarm/domain/alarm-status';
import { DeliveryPriority, DeliveryStatus } from '@core/alarm/domain/delivery-status';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

interface DeliveryRow {
    id: string;
    alarm_id: string;
    recipient_id: string;
    client_ref: string;
    priority: DeliveryPriority;
    attempts: number;
    lease_token: string;
    recovered: boolean;
    body: string;
}

function toClaimedDelivery(row: DeliveryRow): ClaimedDelivery {
    return {
        id: String(row.id),
        alarmId: row.alarm_id,
        recipientId: row.recipient_id,
        body: row.body,
        clientRef: row.client_ref,
        priority: row.priority,
        attempts: row.attempts,
        leaseToken: row.lease_token,
        recovered: row.recovered,
    };
}

@Injectable()
export class DeliveryPersistenceAdapter implements DeliveryPort {
    constructor(
        @InjectRepository(AlarmDelivery)
        private readonly repo: Repository<AlarmDelivery>,
    ) {}

    /** 적재 중 워커가 죽어 재실행되어도 중복이 생기지 않도록 이미 있는 행은 무시한다 */
    async create(
        alarmId: string,
        recipientIds: string[],
        priority: DeliveryPriority,
    ): Promise<number> {
        if (recipientIds.length === 0) return 0;

        const result = await this.repo
            .createQueryBuilder()
            .insert()
            .into(AlarmDelivery)
            .values(
                recipientIds.map((recipientId) => ({
                    alarmId,
                    recipientId,
                    priority,
                    clientRef: `${alarmId}:${recipientId}`,
                })),
            )
            .orIgnore()
            .execute();

        return result.identifiers.filter(Boolean).length;
    }

    /**
     * 발송 건 점유.
     * PENDING과 lease 만료된 IN_FLIGHT를 함께 가져오고 SKIP LOCKED로 중복 점유를 막는다.
     * prev_status를 남겨야 회수된 건(recovered)을 구분할 수 있다.
     */
    async claim(workerId: string, limit: number, leaseSec: number): Promise<ClaimedDelivery[]> {
        const result = await this.repo.query(
            `
            WITH picked AS (
                SELECT d.id, d.status AS prev_status
                FROM alarm_deliveries d
                JOIN alarms a ON a.id = d.alarm_id
                WHERE a.status = $4
                  AND d.status IN ($5, $6)
                  AND d.next_attempt_at <= now()
                ORDER BY d.priority, d.next_attempt_at
                LIMIT $2
                FOR UPDATE OF d SKIP LOCKED
            )
            UPDATE alarm_deliveries d
            SET status          = $6,
                locked_by       = $1,
                lease_token     = gen_random_uuid(),
                next_attempt_at = now() + ($3 || ' seconds')::interval,
                attempts        = d.attempts + CASE WHEN p.prev_status = $5 THEN 1 ELSE 0 END,
                recovery_count  = d.recovery_count + CASE WHEN p.prev_status = $6 THEN 1 ELSE 0 END,
                updated_at      = now()
            FROM picked p
            WHERE d.id = p.id
            RETURNING d.id, d.alarm_id, d.recipient_id, d.client_ref,
                      d.priority, d.attempts, d.lease_token,
                      (p.prev_status = $6) AS recovered,
                      (SELECT body FROM alarms WHERE id = d.alarm_id) AS body
            `,
            [
                workerId,
                limit,
                leaseSec,
                AlarmStatus.SENDING,
                DeliveryStatus.PENDING,
                DeliveryStatus.IN_FLIGHT,
            ],
        );

        return toRows<DeliveryRow>(result).map(toClaimedDelivery);
    }

    /** lease를 잃은 워커의 뒤늦은 쓰기가 다른 워커의 결과를 덮어쓰지 않게 한다 */
    async updateResult(id: string, leaseToken: string, result: DeliveryResult): Promise<boolean> {
        const updated = await this.repo.update(
            { id, leaseToken },
            {
                status: result.status,
                messageId: result.messageId ?? null,
                lastError: result.lastError ?? null,
                ...(result.nextAttemptAt && { nextAttemptAt: result.nextAttemptAt }),
                ...(result.status === DeliveryStatus.SENT && { sentAt: new Date() }),
                leaseToken: null,
            },
        );

        return updated.affected === 1;
    }

    /** lease가 이미 풀린 UNKNOWN 건은 토큰 대신 상태를 조건으로 걸어 확정한다 */
    async settleUnknown(id: string, result: DeliveryResult): Promise<boolean> {
        const updated = await this.repo.update(
            { id, status: DeliveryStatus.UNKNOWN },
            {
                status: result.status,
                messageId: result.messageId ?? null,
                lastError: result.lastError ?? null,
                ...(result.nextAttemptAt && { nextAttemptAt: result.nextAttemptAt }),
                ...(result.status === DeliveryStatus.SENT && { sentAt: new Date() }),
            },
        );

        return updated.affected === 1;
    }

    /** 이미 요청이 나간 IN_FLIGHT는 회수할 수 없으므로 PENDING만 취소한다 */
    async cancel(alarmId: string): Promise<number> {
        const result = await this.repo.update(
            { alarmId, status: DeliveryStatus.PENDING },
            { status: DeliveryStatus.CANCELLED },
        );

        return result.affected ?? 0;
    }

    async find(status: DeliveryStatus, limit: number): Promise<ClaimedDelivery[]> {
        const result = await this.repo.query(
            `
            SELECT d.id, d.alarm_id, d.recipient_id, d.client_ref,
                   d.priority, d.attempts, d.lease_token, a.body,
                   true AS recovered
            FROM alarm_deliveries d
            JOIN alarms a ON a.id = d.alarm_id
            WHERE d.status = $1
            ORDER BY d.updated_at
            LIMIT $2
            `,
            [status, limit],
        );

        return toRows<DeliveryRow>(result).map(toClaimedDelivery);
    }

    async countByStatus(alarmId: string): Promise<DeliveryStats> {
        const rows: { status: DeliveryStatus; count: string }[] = await this.repo
            .createQueryBuilder('d')
            .select('d.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .where('d.alarm_id = :alarmId', { alarmId })
            .groupBy('d.status')
            .getRawMany();

        const stats: DeliveryStats = {
            pending: 0,
            inFlight: 0,
            sent: 0,
            failed: 0,
            unknown: 0,
            cancelled: 0,
        };

        const keyOf: Record<DeliveryStatus, keyof DeliveryStats> = {
            [DeliveryStatus.PENDING]: 'pending',
            [DeliveryStatus.IN_FLIGHT]: 'inFlight',
            [DeliveryStatus.SENT]: 'sent',
            [DeliveryStatus.FAILED]: 'failed',
            [DeliveryStatus.UNKNOWN]: 'unknown',
            [DeliveryStatus.CANCELLED]: 'cancelled',
        };

        for (const row of rows) {
            stats[keyOf[row.status]] = Number(row.count);
        }

        return stats;
    }
}
