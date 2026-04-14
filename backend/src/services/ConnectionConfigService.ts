import { AppDataSource } from '../config/database';
import { TeradataConnection } from '../entities';
import { cryptoService } from './CryptoService';
import { ConnectionConfig } from './TeradataService';

export async function resolveConnectionConfig(connectionId: string): Promise<ConnectionConfig> {
  const repo = AppDataSource.getRepository(TeradataConnection);
  const conn = await repo.findOne({ where: { id: connectionId } });

  if (!conn) {
    throw new Error('Conexão não encontrada');
  }

  return {
    host: conn.host,
    port: conn.port,
    username: conn.username,
    password: cryptoService.decrypt(conn.password),
    databaseName: conn.databaseName,
    jdbcParams: (conn.jdbcParams ?? {}) as Record<string, string | number | boolean>
  };
}
