import {
    SendResults,
    SendResultType,
    type SendResult,
} from '@core/alarm/application/port/out/type/sender.type';

/**
 * HTTP 응답을 처리 방식으로 분류한다.
 * 외부 API가 바뀌어도 코어가 영향받지 않도록 이 경계에서만상태 코드를 해석한다.
 */
export function classifySendResponse(
    status: number | undefined,
    retryAfterHeader: string | undefined,
    messageId: string | undefined,
    errorMessage: string,
    isTimeout: boolean,
): SendResult {
    // 응답을 못 받았으면 발송 여부를 알 수 없다. 조회로 확정 해야함.
    if (isTimeout || status === undefined) {
        return SendResults.unknown(errorMessage);
    }

    if (status >= 200 && status < 300) {
        return SendResults.sent(messageId ?? '');
    }

    // 처리량 초과 — 서버가 알려준 시간만큼 전체가 쉬어야 한다
    if (status === 429) {
        return SendResults.rateLimited(parseRetryAfterMs(retryAfterHeader));
    }

    // 4xx는 같은 요청을 다시 보내도 결과가 같다 (수신 거부 등)
    if (status >= 400 && status < 500) {
        return SendResults.permanentFailure(`${status} ${errorMessage}`);
    }

    return SendResults.retryable(`${status} ${errorMessage}`);
}

/** Retry-After는 초 단위 숫자 또는 HTTP 날짜로 온다 */
export function parseRetryAfterMs(header: string | undefined, defaultMs = 1000): number {
    if (!header) return defaultMs;

    const seconds = Number(header);
    if (!Number.isNaN(seconds)) return Math.max(0, seconds * 1000);

    const date = Date.parse(header);
    if (!Number.isNaN(date)) return Math.max(0, date - Date.now());

    return defaultMs;
}
