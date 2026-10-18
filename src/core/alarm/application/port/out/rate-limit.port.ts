export const RATE_LIMIT_PORT = Symbol('RateLimitPort');

export interface RateLimitPort {
    /**
     * 토큰 1개를 획득할 때까지 대기한다.
     * 워커 수와 무관하게 전역 한도를 유지해야 하므로 공유 저장소에 구현한다.
     */
    acquire(): Promise<void>;

    /** 429 수신 시 전체 워커를 일시 정지시킨다 */
    pauseFor(durationMs: number): Promise<void>;
}
