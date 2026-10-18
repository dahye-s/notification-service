/**
 * 지수 백오프에 지터를 더한 대기 시간.
 * 지터가 없으면 동시에 실패한 건들이 같은 시각에 재시도되어 다시 몰린다.
 */
export function calculateBackoffMs(attempt: number, baseMs: number, maxMs: number): number {
    const exponential = Math.min(baseMs * 2 ** Math.max(0, attempt - 1), maxMs);

    // full jitter — 0 ~ exponential 사이에서 무작위로 고른다
    return Math.floor(Math.random() * exponential);
}

/** 재시도 한도 초과 여부. 워커 장애로 회수된 횟수는 포함하지 않는다 */
export function isRetryExhausted(attempts: number, maxAttempts: number): boolean {
    return attempts >= maxAttempts;
}
