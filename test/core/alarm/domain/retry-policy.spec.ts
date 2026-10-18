import { calculateBackoffMs, isRetryExhausted } from '@core/alarm/domain/retry-policy';

const BASE_MS = 1000;
const MAX_MS = 60_000;

describe('calculateBackoffMs', () => {
    afterEach(() => jest.restoreAllMocks());

    const withJitter = (ratio: number) => jest.spyOn(Math, 'random').mockReturnValue(ratio);

    it('doubles the ceiling on every attempt', () => {
        withJitter(0.999_999);

        expect(calculateBackoffMs(1, BASE_MS, MAX_MS)).toBe(999);
        expect(calculateBackoffMs(2, BASE_MS, MAX_MS)).toBe(1999);
        expect(calculateBackoffMs(3, BASE_MS, MAX_MS)).toBe(3999);
    });

    it('clamps the ceiling at the configured maximum', () => {
        withJitter(0.999_999);

        // 2^9 * 1000 would be 512s without the clamp
        expect(calculateBackoffMs(10, BASE_MS, MAX_MS)).toBe(MAX_MS - 1);
    });

    // without jitter every delivery that failed together retries at the same instant
    it('spreads retries across the whole window', () => {
        withJitter(0);
        expect(calculateBackoffMs(3, BASE_MS, MAX_MS)).toBe(0);

        withJitter(0.5);
        expect(calculateBackoffMs(3, BASE_MS, MAX_MS)).toBe(2000);
    });

    it('treats the first attempt as the base window', () => {
        withJitter(0.999_999);
        expect(calculateBackoffMs(0, BASE_MS, MAX_MS)).toBe(999);
    });
});

describe('isRetryExhausted', () => {
    it('stops once the attempt count reaches the limit', () => {
        expect(isRetryExhausted(4, 5)).toBe(false);
        expect(isRetryExhausted(5, 5)).toBe(true);
        expect(isRetryExhausted(6, 5)).toBe(true);
    });
});
