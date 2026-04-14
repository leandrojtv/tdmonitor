import dotenv from 'dotenv';

dotenv.config();

function getEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;

  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }

  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3001),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost',
  encryptionKey: getEnv('ENCRYPTION_KEY', '12345678901234567890123456789012'),
  teradataTimeoutMs: Number(process.env.TERADATA_TIMEOUT_MS ?? 30000),
  cacheTtlMinutes: Number(process.env.CACHE_TTL_MINUTES ?? 15),
  db: {
    host: getEnv('DB_HOST', 'db'),
    port: Number(process.env.DB_PORT ?? 5432),
    username: getEnv('DB_USERNAME', 'td_monitor_user'),
    password: getEnv('DB_PASSWORD', 'td_monitor_pass'),
    database: getEnv('DB_DATABASE', 'td_monitor')
  },
  teradata: {
    username: getEnv('TERADATA_USERNAME', 'dbc'),
    password: getEnv('TERADATA_PASSWORD', 'dbc'),
    driverClass: process.env.TERADATA_JDBC_DRIVER_CLASS ?? 'com.teradata.jdbc.TeraDriver',
    jarPath: process.env.TERADATA_JDBC_JAR_PATH ?? '/opt/teradata/jdbc/terajdbc4.jar'
  }
};
