import JDBC from 'jdbc';
import jinst from 'jdbc/lib/jinst';
import { env } from '../config/env';
import { resolveConnectionConfig } from './ConnectionConfigService';

export type ConnectionConfig = {
  host: string;
  port?: number;
  username: string;
  password: string;
  databaseName?: string | null;
  jdbcParams?: Record<string, string | number | boolean>;
};

export type QueryResult = {
  columns: string[];
  rows: Record<string, unknown>[];
  duration_ms: number;
  row_count: number;
};

function parseErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? 'Erro desconhecido');
  const lower = raw.toLowerCase();

  if (lower.includes('econnrefused') || lower.includes('connect timed out')) return 'Timeout ao conectar no Teradata';
  if (lower.includes('unknownhost') || lower.includes('enotfound')) return 'Host não encontrado';
  if (lower.includes('authentication') || lower.includes('logon failed') || lower.includes('invalid credentials')) {
    return 'Credenciais inválidas';
  }

  return raw;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout ao executar operação JDBC')), timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export class TeradataService {
  private jdbc?: JDBC;
  private readonly timeoutMs: number;

  constructor(timeoutMs = env.teradataTimeoutMs) {
    this.timeoutMs = timeoutMs;

    if (!jinst.isJvmCreated()) {
      jinst.addOption('-Xrs');
      jinst.setupClasspath([env.teradata.jarPath]);
    }
  }

  private buildJdbcUrl(config: ConnectionConfig): string {
    const database = config.databaseName ?? 'dbc';
    const extras = Object.entries(config.jdbcParams ?? {})
      .map(([key, value]) => `${key}=${value}`)
      .join(',');

    const suffix = extras ? `,${extras}` : '';
    return `jdbc:teradata://${config.host}/DATABASE=${database},DBS_PORT=${config.port ?? 1025}${suffix}`;
  }

  async connect(connectionConfig: ConnectionConfig): Promise<void> {
    const jdbc = new JDBC({
      url: this.buildJdbcUrl(connectionConfig),
      drivername: env.teradata.driverClass,
      minpoolsize: 1,
      maxpoolsize: 1,
      properties: {
        user: connectionConfig.username,
        password: connectionConfig.password
      }
    });

    await withTimeout(
      new Promise<void>((resolve, reject) => {
        jdbc.initialize((error) => {
          if (error) {
            reject(new Error(parseErrorMessage(error)));
            return;
          }

          resolve();
        });
      }),
      this.timeoutMs
    );

    this.jdbc = jdbc;
  }

  async testConnection(connectionId: string): Promise<{ success: boolean; message: string; latencyMs: number }> {
    const start = Date.now();

    try {
      const connectionConfig = await resolveConnectionConfig(connectionId);
      await this.connect(connectionConfig);
      await this.executeRawQuery('SELECT 1 AS ok');
      return {
        success: true,
        message: 'Conexão testada com sucesso',
        latencyMs: Date.now() - start
      };
    } catch (error) {
      return {
        success: false,
        message: parseErrorMessage(error),
        latencyMs: Date.now() - start
      };
    } finally {
      await this.disconnect();
    }
  }

  async executeQuery(connectionId: string, sql: string): Promise<QueryResult> {
    const start = Date.now();
    const connectionConfig = await resolveConnectionConfig(connectionId);
    await this.connect(connectionConfig);

    try {
      const rows = await this.executeRawQuery(sql);
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
      return {
        columns,
        rows,
        duration_ms: Date.now() - start,
        row_count: rows.length
      };
    } catch (error) {
      throw new Error(parseErrorMessage(error));
    } finally {
      await this.disconnect();
    }
  }

  async disconnect(): Promise<void> {
    this.jdbc = undefined;
  }

  private async executeRawQuery(sql: string): Promise<Record<string, unknown>[]> {
    if (!this.jdbc) {
      throw new Error('Conexão JDBC não inicializada.');
    }

    const connection = await withTimeout(
      new Promise<any>((resolve, reject) => {
        this.jdbc?.reserve((error, connObj) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(connObj);
        });
      }),
      this.timeoutMs
    );

    try {
      const statement = await withTimeout(
        new Promise<any>((resolve, reject) => {
          connection.conn.createStatement((error: Error, stmt: any) => {
            if (error) return reject(error);
            resolve(stmt);
          });
        }),
        this.timeoutMs
      );

      const resultSet = await withTimeout(
        new Promise<any>((resolve, reject) => {
          statement.executeQuery(sql, (error: Error, rs: any) => {
            if (error) return reject(error);
            resolve(rs);
          });
        }),
        this.timeoutMs
      );

      const results = await withTimeout(
        new Promise<Record<string, unknown>[]>((resolve, reject) => {
          resultSet.toObjArray((error: Error, objects: Record<string, unknown>[]) => {
            if (error) return reject(error);
            resolve(objects);
          });
        }),
        this.timeoutMs
      );

      return results;
    } finally {
      this.jdbc.release(connection, () => null);
    }
  }
}

export const teradataService = new TeradataService();
