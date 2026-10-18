export enum AlarmStatus {
    /** 생성됨, 발송 전 */
    CREATED = 'CREATED',
    /** 수신자 적재 중 (NORMAL만 거침) */
    PREPARING = 'PREPARING',
    /** 발송 진행 중 */
    SENDING = 'SENDING',
    /** 전부 처리됨 (실패 포함) */
    COMPLETED = 'COMPLETED',
    /** 취소됨 */
    CANCELLED = 'CANCELLED',
}

/**
 * 알림 상태 전이 규칙 - 코어 단일 정의.
 *
 * API(발송 시작·취소)와 워커(적재 완료·발송 완료)가 함께 사용한다.
 * 규칙 판단은 이 함수가, 동시성 보장은 조건부 UPDATE가 담당한다.
 */
const ALARM_TRANSITIONS: Readonly<Record<AlarmStatus, readonly AlarmStatus[]>> = {
    [AlarmStatus.CREATED]: [AlarmStatus.PREPARING, AlarmStatus.SENDING, AlarmStatus.CANCELLED],
    [AlarmStatus.PREPARING]: [AlarmStatus.SENDING, AlarmStatus.CANCELLED],
    [AlarmStatus.SENDING]: [AlarmStatus.COMPLETED, AlarmStatus.CANCELLED],
    [AlarmStatus.COMPLETED]: [],
    [AlarmStatus.CANCELLED]: [],
};

export function canTransitionAlarm(from: AlarmStatus, to: AlarmStatus): boolean {
    return ALARM_TRANSITIONS[from].includes(to);
}

/** 발송 시작이 가능한 상태 - 조건부 UPDATE의 WHERE 절에 사용 */
export const SENDABLE_ALARM_STATUSES = [AlarmStatus.CREATED] as const;

/** 취소가 가능한 상태 — 조건부 UPDATE의 WHERE 절에 사용 */
export const CANCELLABLE_ALARM_STATUSES = [
    AlarmStatus.CREATED,
    AlarmStatus.PREPARING,
    AlarmStatus.SENDING,
] as const;
