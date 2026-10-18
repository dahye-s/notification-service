import {
    NormalRecipientsNotAllowedError,
    UrgentRecipientsExceededError,
    UrgentRecipientsRequiredError,
} from '@core/shared/error/domain-error';
import { AlarmType, URGENT_MAX_RECIPIENTS } from './alarm-type';

/**
 * 수신자 지정 규칙.
 *
 * 긴급 알림은 요청에서 수신자를 직접 지정하고,
 * 일반 알림은 전체 사용자가 대상이므로 수신자를 지정할 수 없다.
 */
export function validateRecipients(type: AlarmType, recipientIds?: string[]): void {
    const count = recipientIds?.length ?? 0;

    if (type === AlarmType.URGENT) {
        // 긴급 알림인데 수신자가 없는 경우
        if (count === 0) throw new UrgentRecipientsRequiredError();

        // 긴급 알림인 경우 최대 100건을 넘을 수 없음
        if (count > URGENT_MAX_RECIPIENTS) {
            throw new UrgentRecipientsExceededError(URGENT_MAX_RECIPIENTS, count);
        }

        return;
    }

    // 일반 알림인데 수신자를 지정한 경우
    if (count > 0) throw new NormalRecipientsNotAllowedError();
}
