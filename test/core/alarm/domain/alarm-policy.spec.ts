import {
    NormalRecipientsNotAllowedError,
    UrgentRecipientsExceededError,
    UrgentRecipientsRequiredError,
} from '@core/shared/error/domain-error';
import { validateRecipients } from '@core/alarm/domain/alarm-policy';
import { AlarmType, URGENT_MAX_RECIPIENTS } from '@core/alarm/domain/alarm-type';

const recipients = (count: number): string[] =>
    Array.from({ length: count }, (_, i) => `u_${i}`);

describe('validateRecipients', () => {
    describe('urgent alarm', () => {
        it('requires explicit recipients', () => {
            expect(() => validateRecipients(AlarmType.URGENT)).toThrow(
                UrgentRecipientsRequiredError,
            );
            expect(() => validateRecipients(AlarmType.URGENT, [])).toThrow(
                UrgentRecipientsRequiredError,
            );
        });

        it('accepts up to the maximum', () => {
            expect(() =>
                validateRecipients(AlarmType.URGENT, recipients(URGENT_MAX_RECIPIENTS)),
            ).not.toThrow();
        });

        it('rejects one over the maximum', () => {
            expect(() =>
                validateRecipients(AlarmType.URGENT, recipients(URGENT_MAX_RECIPIENTS + 1)),
            ).toThrow(UrgentRecipientsExceededError);
        });
    });

    describe('normal alarm', () => {
        // a normal alarm always targets every user, so a recipient list would be silently ignored
        it('rejects explicit recipients', () => {
            expect(() => validateRecipients(AlarmType.NORMAL, recipients(1))).toThrow(
                NormalRecipientsNotAllowedError,
            );
        });

        it('accepts an omitted or empty list', () => {
            expect(() => validateRecipients(AlarmType.NORMAL)).not.toThrow();
            expect(() => validateRecipients(AlarmType.NORMAL, [])).not.toThrow();
        });
    });
});
