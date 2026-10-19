import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Alarm } from '../../core/alarm/domain/alarm';
import { AlarmDelivery } from '../../core/alarm/domain/alarm-delivery';

export const dataSourceOptions: DataSourceOptions = {
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USER ?? 'admin',
    password: process.env.DB_PASSWORD ?? 'noti_dev',
    database: process.env.DB_NAME ?? 'notification',

    // glob 대신 명시적 import — 엔티티가 2개뿐이라 경로 문제를 피한다
    entities: [Alarm, AlarmDelivery],
    migrations: [__dirname + '/../../migrations/*{.ts,.js}'],

    // 스키마 변경은 마이그레이션으로만 (운영 환경 가정)
    synchronize: false,
    // 전체 쿼리를 찍으면 대량 insert 파라미터에 터미널이 묻힌다
    logging: ['error', 'warn'],
    maxQueryExecutionTime: 1000,
};

export default new DataSource(dataSourceOptions);
