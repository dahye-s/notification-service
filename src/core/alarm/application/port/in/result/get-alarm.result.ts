import { Alarm } from '@core/alarm/domain/alarm';
import { DeliveryStats } from '../../out/type/delivery.type';

/** 단건 조회 — 알림 정보와 발송 진행률을 함께 반환 */
export interface GetAlarmResult {
    alarm: Alarm;
    stats: DeliveryStats;
}
