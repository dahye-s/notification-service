import type { GetAlarmResult } from '@core/alarm/application/port/in/result/get-alarm.result';

/** 단건용. 발송 건을 집계해 상세 진행률을 제공한다 */
export class AlarmDetailResponseDto {
    static of({ alarm, stats }: GetAlarmResult) {
        return {
            id: alarm.id,
            type: alarm.type,
            status: alarm.status,
            title: alarm.title,
            body: alarm.body,
            progress: {
                total: alarm.totalCount,
                pending: stats.pending,
                inFlight: stats.inFlight,
                sent: stats.sent,
                failed: stats.failed,
                unknown: stats.unknown,
                cancelled: stats.cancelled,
            },
            createdAt: alarm.createdAt,
            startedAt: alarm.startedAt,
            finishedAt: alarm.finishedAt,
        };
    }
}
