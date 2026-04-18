import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from './env';
import { ExecutionLog, PanelDataCache, ReportPanel, Schedule, TeradataConnection } from '../entities';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.db.host,
  port: env.db.port,
  username: env.db.username,
  password: env.db.password,
  database: env.db.database,
  synchronize: false,
  logging: false,
  entities: [TeradataConnection, ReportPanel, Schedule, PanelDataCache, ExecutionLog],
  migrations: [],
  subscribers: []
});

export async function initializeDatabase(): Promise<void> {
  try {
    await AppDataSource.initialize();
    await AppDataSource.runMigrations();
    await AppDataSource.synchronize();
    console.log('✅ Conexão com PostgreSQL estabelecida.');
  } catch (error) {
    console.error('❌ Erro ao conectar no PostgreSQL:', error);
    throw error;
  }
}
