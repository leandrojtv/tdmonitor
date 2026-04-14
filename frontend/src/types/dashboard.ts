export type DashboardPanelData = {
  panelId: string;
  panelKey: string;
  displayName: string;
  data: {
    result_type?: 'single_row' | 'table' | 'kpi';
    columns?: Array<{ label: string; target_field: string }>;
    rows?: Record<string, unknown>[];
  } | null;
  executedAt: string | null;
  rowCount: number;
  durationMs: number;
};

export type DashboardData = Record<string, DashboardPanelData[]>;

export type DashboardStatus = {
  lastExecution: string | null;
  nextExecutionHint: string | null;
  activeConnections: number;
  activeSchedules: number;
  cacheCleanupAt: string;
};
