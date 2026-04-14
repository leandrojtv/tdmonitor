export type ExecutionLog = {
  id: string;
  scheduleId: string | null;
  panelId: string | null;
  connectionId: string | null;
  status: 'success' | 'error';
  durationMs: number | null;
  rowCount: number | null;
  errorMessage: string | null;
  executedAt: string;
};

export type PaginatedLogs = {
  items: ExecutionLog[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
