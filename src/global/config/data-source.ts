export const dataSourceOptions = {
  ttype: 'postgres' as const,
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'admin',
  password: process.env.DB_PASSWORD ?? 'noti_dev',
  database: process.env.DB_NAME ?? 'notification',
};
