import { dataSourceOptions } from '@global/config/data-source';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
    imports: [ConfigModule.forRoot({ isGlobal: true }), TypeOrmModule.forRoot(dataSourceOptions)],
})
export class DatabaseModule {}
