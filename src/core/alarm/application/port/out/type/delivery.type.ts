import { DeliveryPriority, DeliveryStatus } from '@core/alarm/domain/delivery-status';

/** 워커가 점유한 발송 건. 발송에 필요한 최소 정보만 담는다 */
export interface ClaimedDelivery {
    id: string;
    alarmId: string;
    recipientId: string;
    body: string;
    clientRef: string;
    priority: DeliveryPriority;
    attempts: number;
    /** 점유권 증명 — 결과 기록 시 이 값으로 검증한다 */
    leaseToken: string;
    /** true면 lease 만료로 회수된 건. 발송 여부가 불확실하므로 조회가 필요하다 */
    recovered: boolean;
}

/** 알림별 발송 상태 집계 */
export interface DeliveryStats {
    pending: number;
    inFlight: number;
    sent: number;
    failed: number;
    unknown: number;
    cancelled: number;
}

/** 발송 결과 기록 내용 */
export interface DeliveryResult {
    status: DeliveryStatus;
    messageId?: string;
    lastError?: string;
    nextAttemptAt?: Date;
}
