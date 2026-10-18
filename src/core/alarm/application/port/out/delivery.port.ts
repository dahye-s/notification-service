import { DeliveryPriority, DeliveryStatus } from '@core/alarm/domain/delivery-status';
import { ClaimedDelivery, DeliveryResult, DeliveryStats } from './type/delivery.type';

export const DELIVERY_PORT = Symbol('DeliveryPort');

export interface DeliveryPort {
    /** 수신자 적재. 중복 실행에 안전해야 한다. (ON CONFLICT DO NOTHING) */
    create(alarmId: string, recipientIds: string[], priority: DeliveryPriority): Promise<number>;

    /** PENDING과 lease 만료된 IN_FLIGHT를 함께 점유. SKIP LOCKED, 긴급 우선 */
    claim(workerId: string, limit: number, leaseSec: number): Promise<ClaimedDelivery[]>;

    /** leaseToken이 일치할 때만 반영된다 (fencing) */
    updateResult(id: string, leaseToken: string, result: DeliveryResult): Promise<boolean>;

    /** PENDING 건만 취소한다. IN_FLIGHT는 이미 나갔을 수 있어 회수 불가 */
    cancel(alarmId: string): Promise<number>;

    find(status: DeliveryStatus, limit: number): Promise<ClaimedDelivery[]>;

    countByStatus(alarmId: string): Promise<DeliveryStats>;
}
