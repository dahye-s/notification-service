export interface SendRequest {
    alarmId: string;
    recipientId: string;
    body: string;
    clientRef: string;
}

export interface MessageRecord {
    messageId: string;
    recipientId: string;
    sentAt: string;
}

/**
 * 발송 결과를 처리 방식별로 분류한 것.
 * 어댑터가 HTTP 응답을 이 타입으로 변환하고 코어는 이걸 보도 다음 동작을 결정한다.
 */
export enum SendResultType {
    /** 202 — 발송 확정 */
    SENT = 'SENT',
    /** 400 — 영구 실패, 재시도하지 않음 */
    PERMANENT_FAILURE = 'PERMANENT_FAILURE',
    /** 429 — 전체 워커가 Retry-After만큼 정지 후 재시도 */
    RATE_LIMITED = 'RATE_LIMITED',
    /** 5xx — 백오프 후 재시도 */
    RETRYABLE = 'RETRYABLE',
    /** 타임아웃 — 발송 여부 미확인. clientRef 조회로 확정 */
    UNKNOWN = 'UNKNOWN',
}

export type SendResult =
    | { type: SendResultType.SENT; messageId: string }
    | { type: SendResultType.PERMANENT_FAILURE; error: string }
    | { type: SendResultType.RATE_LIMITED; retryAfterMs: number }
    | { type: SendResultType.RETRYABLE; error: string }
    | { type: SendResultType.UNKNOWN; error: string };

export const SendResults = {
    sent: (messageId: string): SendResult => ({
        type: SendResultType.SENT,
        messageId,
    }),
    permanentFailure: (error: string): SendResult => ({
        type: SendResultType.PERMANENT_FAILURE,
        error,
    }),
    rateLimited: (retryAfterMs: number): SendResult => ({
        type: SendResultType.RATE_LIMITED,
        retryAfterMs,
    }),
    retryable: (error: string): SendResult => ({
        type: SendResultType.RETRYABLE,
        error,
    }),
    unknown: (error: string): SendResult => ({
        type: SendResultType.UNKNOWN,
        error,
    }),
};
