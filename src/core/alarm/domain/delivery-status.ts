export enum DeliveryStatus {
    /** 발송 대기 (초기값 또는 재시도 예정) */
    PENDING = 'PENDING',
    /** 워커가 점유, 발송 중 */
    IN_FLIGHT = 'IN_FLIGHT',
    /** 발송 확정 (mock이 202로 접수함) */
    SENT = 'SENT',
    /** 영구 실패 (400 수신 또는 재시도 한도 초과) */
    FAILED = 'FAILED',
    /** 결과 미확인 — 타임아웃 또는 lease 만료. clientRef 조회로 확정한다 */
    UNKNOWN = 'UNKNOWN',
    /** 알림 취소로 발송되지 않음 */
    CANCELLED = 'CANCELLED',
}

/**
 * 워커 클레임 대상.
 * IN_FLIGHT가 포함된 이유는 lease 만료 건(워커 사망)을 같은 쿼리로 회수하기 위함.
 */
export const CLAIMABLE_DELIVERY_STATUSES = [
    DeliveryStatus.PENDING,
    DeliveryStatus.IN_FLIGHT,
] as const;

/** 결과가 확정되어 더 이상 처리하지 않는 상태 */
export const TERMINAL_DELIVERY_STATUSES = [
    DeliveryStatus.SENT,
    DeliveryStatus.FAILED,
    DeliveryStatus.CANCELLED,
] as const;

/**
 * 확정되지 않은 상태 — 하나라도 남아 있으면 알림을 COMPLETED로 볼 수 없다.
 * 특히 UNKNOWN은 발송 여부가 미확인이므로 복구(clientRef 조회) 대상이다.
 */
export const UNSETTLED_DELIVERY_STATUSES = [
    DeliveryStatus.PENDING,
    DeliveryStatus.IN_FLIGHT,
    DeliveryStatus.UNKNOWN,
] as const;

/** 취소 가능한 상태 — 이미 요청이 나간 IN_FLIGHT는 회수할 수 없다 */
export const CANCELLABLE_DELIVERY_STATUSES = [DeliveryStatus.PENDING] as const;

/** 클레임 우선순위 — 낮을수록 먼저 처리 (ORDER BY priority) */
export enum DeliveryPriority {
    URGENT = 0,
    NORMAL = 1,
}
