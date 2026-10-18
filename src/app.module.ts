import { HealthController } from '@adapter/in/web/health.controller';
import { AlarmModule } from '@global/module/alarm.module';
import { DatabaseModule } from '@global/module/database.module';
import { Module } from '@nestjs/common';

@Module({
    imports: [DatabaseModule, AlarmModule],
    controllers: [HealthController],
})
export class AppModule {}
