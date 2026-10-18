import type { Alarm } from '@core/alarm/domain/alarm';

/** 목록용. alarms의 통계 컬럼만 사용해 추가 집계를 피한다 */
export class AlarmResponseDto {
    static of(alarm: Alarm) {
        return {
            id: alarm.id,
            type: alarm.type,
            status: alarm.status,
            title: alarm.title,
            progress: {
                total: alarm.totalCount,
                sent: alarm.sentCount,
                failed: alarm.failedCount,
                unknown: alarm.unknownCount,
            },
            createdAt: alarm.createdAt,
        };
    }
}
