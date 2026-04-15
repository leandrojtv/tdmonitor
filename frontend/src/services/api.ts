import axios from 'axios';
import toast from 'react-hot-toast';
import { ConnectionPayload, TeradataConnection } from '../types/connection';
import { PanelDefinition } from '../types/panel';
import { Schedule } from '../types/schedule';
import { DashboardData, DashboardStatus } from '../types/dashboard';
import { PaginatedLogs } from '../types/log';

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api'
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error?.response?.data?.message ?? 'Erro inesperado na API';
    toast.error(message);
    return Promise.reject(error);
  }
);

async function unwrap<T>(request: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const response = await request;
  return response.data.data;
}

export const apiService = {
  getConnections: () => unwrap<TeradataConnection[]>(api.get('/connections')),
  getConnection: (id: string) => unwrap<TeradataConnection>(api.get(`/connections/${id}`)),
  createConnection: (payload: ConnectionPayload) => unwrap<TeradataConnection>(api.post('/connections', payload)),
  updateConnection: (id: string, payload: ConnectionPayload) => unwrap<TeradataConnection>(api.put(`/connections/${id}`, payload)),
  deleteConnection: (id: string) => unwrap(api.delete(`/connections/${id}`)),
  testConnection: (id: string) => unwrap<{ success: boolean; message: string; latencyMs: number }>(api.post(`/connections/${id}/test`)),

  getPanels: (category?: string) => unwrap<PanelDefinition[]>(api.get('/panels', { params: { category } })),
  createPanel: (
    payload: Pick<PanelDefinition, 'connectionId' | 'panelKey' | 'displayName' | 'category'> &
      Partial<Pick<PanelDefinition, 'description' | 'sqlQuery' | 'fieldMappings' | 'executionOrder'>>
  ) => unwrap<PanelDefinition>(api.post('/panels', payload)),
  getPanel: (id: string) => unwrap<PanelDefinition>(api.get(`/panels/${id}`)),
  updatePanel: (id: string, payload: Pick<PanelDefinition, 'sqlQuery' | 'fieldMappings'>) =>
    unwrap<PanelDefinition>(api.put(`/panels/${id}`, payload)),
  togglePanel: (id: string, isEnabled: boolean) => unwrap<PanelDefinition>(api.put(`/panels/${id}/toggle`, { isEnabled })),
  executePanel: (id: string) => unwrap(api.post(`/panels/${id}/execute`)),
  previewPanel: (id: string) => unwrap(api.post(`/panels/${id}/preview`)),
  panelData: (id: string) => unwrap(api.get(`/panels/${id}/data`)),

  getSchedules: () => unwrap<Schedule[]>(api.get('/schedules')),
  getSchedule: (id: string) => unwrap<Schedule>(api.get(`/schedules/${id}`)),
  createSchedule: (payload: Pick<Schedule, 'connectionId' | 'name' | 'cronExpression' | 'panelIds'>) =>
    unwrap<Schedule>(api.post('/schedules', payload)),
  updateSchedule: (id: string, payload: Pick<Schedule, 'connectionId' | 'name' | 'cronExpression' | 'panelIds'>) =>
    unwrap<Schedule>(api.put(`/schedules/${id}`, payload)),
  deleteSchedule: (id: string) => unwrap(api.delete(`/schedules/${id}`)),
  toggleSchedule: (id: string, isEnabled: boolean) => unwrap<Schedule>(api.put(`/schedules/${id}/toggle`, { isEnabled })),
  runSchedule: (id: string) => unwrap<Schedule>(api.post(`/schedules/${id}/run`)),

  getDashboardData: () => unwrap<DashboardData>(api.get('/dashboard/data')),
  getDashboardStatus: () => unwrap<DashboardStatus>(api.get('/dashboard/status')),

  getLogs: (page = 1, limit = 50, panelId?: string) =>
    unwrap<PaginatedLogs>(api.get('/logs', { params: { page, limit, panel_id: panelId } }))
};
