export enum AlarmType {
    /** 일반 알림 — 전체 사용자 대상 */
    NORMAL = 'NORMAL',
    /** 긴급 알림 — 지정 수신자(최대 100), 우선 처리 */
    URGENT = 'URGENT',
}

export const URGENT_MAX_RECIPIENTS = 100;
