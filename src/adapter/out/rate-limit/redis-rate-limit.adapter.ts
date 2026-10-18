import type { RateLimitPort } from '@core/alarm/application/port/out/rate-limit.port';
import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { ACQUIRE_TOKEN_SCRIPT } from './script/acquire-token.lua';

/**
 * 워커 수와 무관하게 전역 처리량을 유지한다.
 * 워커별로 제한하면 합산 한도를 넘어 429가 계속 발생한다.
 */
@Injectable()
export class RedisRateLimitAdapter implements RateLimitPort, OnModuleDestroy {
    private readonly logger = new Logger(RedisRateLimitAdapter.name);
    private readonly redis: Redis;
    private readonly limitPerSec: number;

    private static readonly WINDOW_KEY = 'rate:window';
    private static readonly GATE_KEY = 'rate:gate';

    constructor() {
        this.redis = new Redis({
            host: process.env.REDIS_HOST ?? 'localhost',
            port: Number(process.env.REDIS_PORT ?? 6379),
            maxRetriesPerRequest: 3,
        });
        this.limitPerSec = Number(process.env.RATE_LIMIT_PER_SEC ?? 45);
    }

    /** 토큰을 얻을 때까지 대기한다 */
    async acquire(): Promise<void> {
        for (;;) {
            const [allowed, waitMs] = (await this.redis.eval(
                ACQUIRE_TOKEN_SCRIPT,
                2,
                RedisRateLimitAdapter.WINDOW_KEY,
                RedisRateLimitAdapter.GATE_KEY,
                String(this.limitPerSec),
            )) as [number, number];

            if (allowed === 1) return;

            await sleep(Math.max(10, Math.ceil(waitMs)));
        }
    }

    /** 한 워커가 받은 429는 전체가 한도를 넘었다는 뜻이므로 모두 멈춘다 */
    async pauseFor(durationMs: number): Promise<void> {
        if (durationMs <= 0) return;

        // 같은 배치의 429가 한꺼번에 들어오므로 처음 하나만 게이트를 세운다.
        // 덮어쓰면 뒤늦은 429가 정지 구간을 계속 연장한다
        const set = await this.redis.set(
            RedisRateLimitAdapter.GATE_KEY,
            '1',
            'PX',
            Math.ceil(durationMs),
            'NX',
        );

        if (set === 'OK') {
            this.logger.warn(`rate limited. pausing all workers for ${durationMs}ms`);
        }
    }

    async onModuleDestroy(): Promise<void> {
        await this.redis.quit();
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
