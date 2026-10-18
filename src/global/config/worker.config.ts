import { randomUUID } from 'node:crypto';

export const workerConfig = {
    /** 컨테이너마다 달라야 locked_by로 추적할 수 있다 */
    workerId: process.env.WORKER_ID ?? `worker-${randomUUID().slice(0, 8)}`,

    /**
     * 작으면 느린 응답을 기다리는 동안 보낼 물량이 없어 처리량이 떨어지고,
     * 크면 긴급 건이 다음 배치까지 기다린다.
     */
    claimBatchSize: Number(process.env.CLAIM_BATCH_SIZE ?? 300),

    /** 한 번에 확정할 미확정 건수 */
    reconcileBatchSize: Number(process.env.RECONCILE_BATCH_SIZE ?? 100),
    /** 발송 타임아웃 × 배치 처리 여유 */
    claimLeaseSec: Number(process.env.CLAIM_LEASE_SEC ?? 30),
    /** 일감이 없을 때만 적용된다 */
    pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 1000),
    /** 장애 시 결과를 모르는 건수의 상한이기도 하다 */
    maxInFlight: Number(process.env.MAX_IN_FLIGHT ?? 100),

    maxAttempts: Number(process.env.MAX_ATTEMPTS ?? 5),
    backoffBaseMs: Number(process.env.BACKOFF_BASE_MS ?? 1000),
    backoffMaxMs: Number(process.env.BACKOFF_MAX_MS ?? 60000),

    /** mock의 limit 상한 */
    userPageSize: Number(process.env.USER_PAGE_SIZE ?? 1000),
};
