/**
 * 코어는 HTTP를 모른다.
 * 어댑터 경계(예외 필터)에서 상태 코드로 변화한다.
 */
export abstract class DomainError extends Error {
    abstract readonly code: string;

    constructor(
        message: string,
        readonly details?: Record<string, unknown>,
    ) {
        super(message);
        this.name = new.target.name;
    }
}

export class AlarmNotFoundError extends DomainError {
    readonly code = 'ALARM_NOT_FOUND';

    constructor(alarmId: string) {
        super('Alarm not found', { alarmId });
    }
}

export class AlarmNotSendableError extends DomainError {
    readonly code = 'ALARM_NOT_SENDABLE';

    constructor(currentStatus: string, allowedStatus: readonly string[]) {
        super('Alarm cannot be sent in its current status', {
            currentStatus,
            allowedStatus,
        });
    }
}

export class AlarmNotCancellableError extends DomainError {
    readonly code = 'ALARM_NOT_CANCELLABLE';

    constructor(currentStatus: string, allowedStatus: readonly string[]) {
        super('Alarm cannot be cancelled in its current status', {
            currentStatus,
            allowedStatus,
        });
    }
}

export class UrgentRecipientsRequiredError extends DomainError {
    readonly code = 'URGENT_RECIPIENTS_REQUIRED';

    constructor() {
        super('Urgent alarm requires recipientIds');
    }
}

export class UrgentRecipientsExceededError extends DomainError {
    readonly code = 'URGENT_RECIPIENTS_EXCEEDED';

    constructor(max: number, actual: number) {
        super(`Urgent alarm allows up to ${max} recipients`, { max, actual });
    }
}

export class NormalRecipientsNotAllowedError extends DomainError {
    readonly code = 'NORMAL_RECIPIENTS_NOT_ALLOWED';

    constructor() {
        super('Normal alarm must not specify recipientIds');
    }
}
