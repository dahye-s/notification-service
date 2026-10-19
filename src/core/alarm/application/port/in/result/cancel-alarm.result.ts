import { Alarm } from '@core/alarm/domain/alarm';

export interface CancelAlarmResult {
    alarm: Alarm;
    /** 취소 처리된 발송 건 수 (이미 나간 건은 제외) */
    cancelledCount: number;
}
