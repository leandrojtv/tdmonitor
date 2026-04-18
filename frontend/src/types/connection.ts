export type TeradataConnection = {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  databaseName: string | null;
  jdbcParams: Record<string, string>;
  isActive: boolean;
  lastTestAt: string | null;
  lastTestSuccess: boolean | null;
  lastTestMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ConnectionPayload = {
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  databaseName?: string | null;
  jdbcParams?: Record<string, string>;
};
