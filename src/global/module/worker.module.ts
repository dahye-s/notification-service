import { DeliveryDispatcher } from '@adapter/in/worker/delivery-dispatcher';
import { DispatchWorker } from '@adapter/in/worker/dispatch.worker';
import { RecipientLoader } from '@adapter/in/worker/recipient-loader';
import { StatsCollector } from '@adapter/in/worker/stats-collector';
import { UnknownReconciler } from '@adapter/in/worker/unknown-reconciler';
import { AlarmPersistenceAdapter } from '@adapter/out/persistence/alarm.persistence-adapter';
import { DeliveryPersistenceAdapter } from '@adapter/out/persistence/delivery.persistence-adapter';
import { RedisRateLimitAdapter } from '@adapter/out/rate-limit/redis-rate-limit.adapter';
import { MockSenderAdapter } from '@adapter/out/sender/mock-sender.adapter';
import { MockUserAdapter } from '@adapter/out/user/mock-user.adapter';
import { ALARM_PORT } from '@core/alarm/application/port/out/alarm.port';
import { DELIVERY_PORT } from '@core/alarm/application/port/out/delivery.port';
import { RATE_LIMIT_PORT } from '@core/alarm/application/port/out/rate-limit.port';
import { SENDER_PORT } from '@core/alarm/application/port/out/sender.port';
import { USER_PORT } from '@core/alarm/application/port/out/user.port';
import { Alarm } from '@core/alarm/domain/alarm';
import { AlarmDelivery } from '@core/alarm/domain/alarm-delivery';
import { DatabaseModule } from '@global/module/database.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

/** 워커 전용 루트 모듈. HTTP 컨트롤러를 포함하지 않는다 */
@Module({
    imports: [DatabaseModule, TypeOrmModule.forFeature([Alarm, AlarmDelivery])],
    providers: [
        DispatchWorker,
        RecipientLoader,
        DeliveryDispatcher,
        StatsCollector,
        UnknownReconciler,

        { provide: ALARM_PORT, useClass: AlarmPersistenceAdapter },
        { provide: DELIVERY_PORT, useClass: DeliveryPersistenceAdapter },
        { provide: SENDER_PORT, useClass: MockSenderAdapter },
        { provide: USER_PORT, useClass: MockUserAdapter },
        { provide: RATE_LIMIT_PORT, useClass: RedisRateLimitAdapter },
    ],
})
export class WorkerModule {}
