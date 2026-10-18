import { AlarmStatus, canTransitionAlarm } from '@core/alarm/domain/alarm-status';

describe('canTransitionAlarm', () => {
    it('allows preparing, sending and cancelling before dispatch starts', () => {
        expect(canTransitionAlarm(AlarmStatus.CREATED, AlarmStatus.PREPARING)).toBe(true);
        expect(canTransitionAlarm(AlarmStatus.CREATED, AlarmStatus.SENDING)).toBe(true);
        expect(canTransitionAlarm(AlarmStatus.CREATED, AlarmStatus.CANCELLED)).toBe(true);
    });

    it('never completes without going through sending', () => {
        expect(canTransitionAlarm(AlarmStatus.CREATED, AlarmStatus.COMPLETED)).toBe(false);
        expect(canTransitionAlarm(AlarmStatus.PREPARING, AlarmStatus.COMPLETED)).toBe(false);
    });

    it('moves forward or cancels while preparing', () => {
        expect(canTransitionAlarm(AlarmStatus.PREPARING, AlarmStatus.SENDING)).toBe(true);
        expect(canTransitionAlarm(AlarmStatus.PREPARING, AlarmStatus.CANCELLED)).toBe(true);
        expect(canTransitionAlarm(AlarmStatus.PREPARING, AlarmStatus.CREATED)).toBe(false);
    });

    it('moves forward or cancels while sending', () => {
        expect(canTransitionAlarm(AlarmStatus.SENDING, AlarmStatus.COMPLETED)).toBe(true);
        expect(canTransitionAlarm(AlarmStatus.SENDING, AlarmStatus.CANCELLED)).toBe(true);
        expect(canTransitionAlarm(AlarmStatus.SENDING, AlarmStatus.PREPARING)).toBe(false);
    });

    // a retried request or a late write from a worker must not revive a finished alarm
    it.each([AlarmStatus.COMPLETED, AlarmStatus.CANCELLED])(
        'leaves %s as a terminal state',
        (terminal) => {
            for (const to of Object.values(AlarmStatus)) {
                expect(canTransitionAlarm(terminal, to)).toBe(false);
            }
        },
    );
});
