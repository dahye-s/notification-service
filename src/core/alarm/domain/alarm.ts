import { AlarmStatus } from './alarm-status';
import { AlarmType } from './alarm-type';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

/** 발송 건(AlarmDelivery)은 알림당 최대 10만 행이므로 관계를 두지 않고 id로만 참조한다. */
@Entity('alarms')
@Index('idx_alarms_list', ['status', 'createdAt'])
export class Alarm {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'enum', enum: AlarmType, default: AlarmType.NORMAL })
    type: AlarmType;

    @Column({ type: 'enum', enum: AlarmStatus, default: AlarmStatus.CREATED })
    status: AlarmStatus;

    @Column({ type: 'varchar', length: 200 })
    title: string;

    @Column({ type: 'text' })
    body: string;

    @Column({ name: 'total_count', type: 'int', default: 0 })
    totalCount: number;

    @Column({ name: 'sent_count', type: 'int', default: 0 })
    sentCount: number;

    @Column({ name: 'failed_count', type: 'int', default: 0 })
    failedCount: number;

    /** 0이 되어야 COMPLETED로 전이할 수 있다 */
    @Column({ name: 'unknown_count', type: 'int', default: 0 })
    unknownCount: number;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;

    @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
    startedAt: Date | null;

    @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
    finishedAt: Date | null;
}
