export type Schedule = {
  id: string;
  connectionId: string;
  name: string;
  cronExpression: string;
  panelIds: string[];
  isEnabled: boolean;
  lastRunAt: string | null;
  lastRunStatus: 'success' | 'error' | 'running' | null;
  lastRunDurationMs: number | null;
  lastErrorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};
