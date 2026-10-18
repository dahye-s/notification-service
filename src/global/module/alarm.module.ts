import { AlarmController } from '@adapter/in/web/alarm.controller';
import { AlarmPersistenceAdapter } from '@adapter/out/persistence/alarm.persistence-adapter';
import { DeliveryPersistenceAdapter } from '@adapter/out/persistence/delivery.persistence-adapter';
import { TransactionAdapter } from '@adapter/out/persistence/transaction.adapter';
import { CANCEL_ALARM_USE_CASE } from '@core/alarm/application/port/in/cancel-alarm.use-case';
import { CREATE_ALARM_USE_CASE } from '@core/alarm/application/port/in/create-alarm.use-case';
import { GET_ALARM_LIST_USE_CASE } from '@core/alarm/application/port/in/get-alarm-list.use-case';
import { GET_ALARM_USE_CASE } from '@core/alarm/application/port/in/get-alarm.use-case';
import { SEND_ALARM_USE_CASE } from '@core/alarm/application/port/in/send-alarm.use-case';
import { ALARM_PORT } from '@core/alarm/application/port/out/alarm.port';
import { DELIVERY_PORT } from '@core/alarm/application/port/out/delivery.port';
import { CancelAlarmService } from '@core/alarm/application/service/cancel-alarm.service';
import { CreateAlarmService } from '@core/alarm/application/service/create-alarm.service';
import { GetAlarmListService } from '@core/alarm/application/service/get-alarm-list.service';
import { GetAlarmService } from '@core/alarm/application/service/get-alarm.service';
import { SendAlarmService } from '@core/alarm/application/service/send-alarm.service';
import { Alarm } from '@core/alarm/domain/alarm';
import { AlarmDelivery } from '@core/alarm/domain/alarm-delivery';
import { TRANSACTION_PORT } from '@core/shared/port/transaction.port';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

/** 포트 토큰과 구현체를 바인딩한다. 코어는 구현체를 모른다 */
@Module({
    imports: [TypeOrmModule.forFeature([Alarm, AlarmDelivery])],
    controllers: [AlarmController],
    providers: [
        { provide: CREATE_ALARM_USE_CASE, useClass: CreateAlarmService },
        { provide: GET_ALARM_LIST_USE_CASE, useClass: GetAlarmListService },
        { provide: GET_ALARM_USE_CASE, useClass: GetAlarmService },
        { provide: SEND_ALARM_USE_CASE, useClass: SendAlarmService },
        { provide: CANCEL_ALARM_USE_CASE, useClass: CancelAlarmService },

        { provide: ALARM_PORT, useClass: AlarmPersistenceAdapter },
        { provide: DELIVERY_PORT, useClass: DeliveryPersistenceAdapter },
        { provide: TRANSACTION_PORT, useClass: TransactionAdapter },
    ],
    // 워커가 포트를 직접 사용한다
    exports: [ALARM_PORT, DELIVERY_PORT, TRANSACTION_PORT],
})
export class AlarmModule {}
