import { SendResultType } from '@core/alarm/application/port/out/type/sender.type';
import { classifySendResponse, parseRetryAfterMs } from '@adapter/out/sender/send-result.classifier';

const classify = (
    status: number | undefined,
    options: {
        retryAfter?: string;
        messageId?: string;
        error?: string;
        isTimeout?: boolean;
    } = {},
) =>
    classifySendResponse(
        status,
        options.retryAfter,
        options.messageId,
        options.error ?? 'error',
        options.isTimeout ?? false,
    );

describe('classifySendResponse', () => {
    it('treats 2xx as delivered and keeps the message id', () => {
        expect(classify(202, { messageId: 'm_1' })).toEqual({
            type: SendResultType.SENT,
            messageId: 'm_1',
        });
    });

    // the request is already accepted, so retrying would duplicate the message
    it('does not retry a 4xx other than 429', () => {
        expect(classify(400).type).toBe(SendResultType.PERMANENT_FAILURE);
        expect(classify(404).type).toBe(SendResultType.PERMANENT_FAILURE);
    });

    it('carries Retry-After through on 429', () => {
        expect(classify(429, { retryAfter: '2' })).toEqual({
            type: SendResultType.RATE_LIMITED,
            retryAfterMs: 2000,
        });
    });

    it('retries 5xx', () => {
        expect(classify(500).type).toBe(SendResultType.RETRYABLE);
        expect(classify(503).type).toBe(SendResultType.RETRYABLE);
    });

    // the server may have accepted it, so resending is what causes duplicates
    it('leaves a timeout unresolved instead of failing it', () => {
        expect(classify(undefined, { isTimeout: true }).type).toBe(SendResultType.UNKNOWN);
    });

    it('leaves a missing status unresolved', () => {
        expect(classify(undefined).type).toBe(SendResultType.UNKNOWN);
    });
});

describe('parseRetryAfterMs', () => {
    it('reads the delta-seconds form', () => {
        expect(parseRetryAfterMs('3')).toBe(3000);
    });

    it('reads the HTTP-date form', () => {
        const twoSecondsLater = new Date(Date.now() + 2000).toUTCString();

        // the header has second precision, so allow for the truncated milliseconds
        expect(parseRetryAfterMs(twoSecondsLater)).toBeGreaterThan(0);
        expect(parseRetryAfterMs(twoSecondsLater)).toBeLessThanOrEqual(2000);
    });

    it('never returns a negative wait for a past date', () => {
        expect(parseRetryAfterMs(new Date(Date.now() - 10_000).toUTCString())).toBe(0);
    });

    it('falls back to the default when the header is missing or unparseable', () => {
        expect(parseRetryAfterMs(undefined)).toBe(1000);
        expect(parseRetryAfterMs('later', 500)).toBe(500);
    });
});
