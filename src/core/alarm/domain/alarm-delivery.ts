import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn,
} from 'typeorm';
import { DeliveryPriority, DeliveryStatus } from './delivery-status';

/**
 * 수신자별 발송 건. 알림당 최대 10만 행.
 *
 * Alarm과 별도 애그리게이트이므로 관계 대신 alarmId로만 참조한다.
 * 상태 변경은 모두 조건부 UPDATE로 수행하며, leaseToken으로 점유권을 검증한다.
 */
@Entity('alarm_deliveries')
@Unique('uq_alarm_recipient', ['alarmId', 'recipientId'])
export class AlarmDelivery {
    @PrimaryGeneratedColumn('increment', { type: 'bigint' })
    id: string;

    @Column({ name: 'alarm_id', type: 'uuid' })
    alarmId: string;

    /** mock 사용자 ID (u_000001) */
    @Column({ name: 'recipient_id', type: 'varchar', length: 64 })
    recipientId: string;

    @Column({ type: 'enum', enum: DeliveryStatus, default: DeliveryStatus.PENDING })
    status: DeliveryStatus;

    @Column({ type: 'smallint', default: DeliveryPriority.NORMAL })
    priority: DeliveryPriority;

    /** 실제 발송 요청 횟수 — 재시도 한도 판단에 사용 */
    @Column({ type: 'smallint', default: 0 })
    attempts: number;

    /** lease 만료로 회수된 횟수 — 워커 장애는 재시도 한도에 포함하지 않는다 */
    @Column({ name: 'recovery_count', type: 'smallint', default: 0 })
    recoveryCount: number;

    /**
     * 이 시각 이후 클레임 가능.
     * PENDING이면 재시도 예약 시각, IN_FLIGHT면 lease 만료 시각(= 회수 가능 시점).
     */
    @Column({ name: 'next_attempt_at', type: 'timestamptz', default: () => 'now()' })
    nextAttemptAt: Date;

    /** 점유한 워커 — 추적·로깅용 */
    @Column({ name: 'locked_by', type: 'varchar', length: 64, nullable: true })
    lockedBy: string | null;

    /** 점유마다 새로 발급. 결과 기록 시 이 값으로 점유권을 검증한다(fencing) */
    @Column({ name: 'lease_token', type: 'uuid', nullable: true })
    leaseToken: string | null;

    /** `{alarmId}:{recipientId}` — 재시도해도 불변. 발송 내역 조회 키 */
    @Column({ name: 'client_ref', type: 'varchar', length: 128 })
    clientRef: string;

    /** mock이 발급한 메시지 ID */
    @Column({ name: 'message_id', type: 'varchar', length: 64, nullable: true })
    messageId: string | null;

    @Column({ name: 'last_error', type: 'varchar', length: 500, nullable: true })
    lastError: string | null;

    @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
    sentAt: Date | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
}
