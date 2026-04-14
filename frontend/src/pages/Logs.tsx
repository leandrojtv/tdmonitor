import { Fragment, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { ApiErrorState, EmptyState } from '../components/ApiState';

export function LogsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState<'all' | 'success' | 'error'>('all');
  const [panelId, setPanelId] = useState('all');
  const [scheduleId, setScheduleId] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const logsQuery = useQuery({
    queryKey: ['logs', page],
    queryFn: () => apiService.getLogs(page, 50),
    refetchInterval: 30000
  });
  const panelsQuery = useQuery({ queryKey: ['panels'], queryFn: apiService.getPanels });
  const schedulesQuery = useQuery({ queryKey: ['schedules'], queryFn: apiService.getSchedules });
  const connectionsQuery = useQuery({ queryKey: ['connections'], queryFn: apiService.getConnections });

  const scheduleName = useMemo(() => Object.fromEntries((schedulesQuery.data ?? []).map((s) => [s.id, s.name])), [schedulesQuery.data]);
  const panelName = useMemo(() => Object.fromEntries((panelsQuery.data ?? []).map((p) => [p.id, p.displayName])), [panelsQuery.data]);
  const connectionName = useMemo(() => Object.fromEntries((connectionsQuery.data ?? []).map((c) => [c.id, c.name])), [connectionsQuery.data]);

  const filtered = useMemo(() => {
    const items = logsQuery.data?.items ?? [];
    return items.filter((log) => {
      if (status !== 'all' && log.status !== status) return false;
      if (panelId !== 'all' && log.panelId !== panelId) return false;
      if (scheduleId !== 'all' && log.scheduleId !== scheduleId) return false;
      const ts = new Date(log.executedAt).getTime();
      if (dateFrom && ts < new Date(`${dateFrom}T00:00:00`).getTime()) return false;
      if (dateTo && ts > new Date(`${dateTo}T23:59:59`).getTime()) return false;
      return true;
    });
  }, [dateFrom, dateTo, logsQuery.data?.items, panelId, scheduleId, status]);

  if (logsQuery.isError) {
    return <ApiErrorState title="Não foi possível carregar os logs" description="A API está indisponível no momento." onRetry={() => logsQuery.refetch()} />;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Logs de Execução</h2>

      <div className="grid gap-2 rounded-lg border border-white/10 bg-[#0f1520] p-3 md:grid-cols-5">
        <input type="date" className="editor-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <input type="date" className="editor-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        <select className="editor-input" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="all">Todos status</option>
          <option value="success">Success</option>
          <option value="error">Error</option>
        </select>
        <select className="editor-input" value={panelId} onChange={(e) => setPanelId(e.target.value)}>
          <option value="all">Todos painéis</option>
          {(panelsQuery.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.panelKey}</option>)}
        </select>
        <select className="editor-input" value={scheduleId} onChange={(e) => setScheduleId(e.target.value)}>
          <option value="all">Todos schedules</option>
          {(schedulesQuery.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {logsQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded bg-white/5" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nenhum log encontrado"
          description="Ajuste os filtros ou execute um agendamento."
          ctaLabel="Executar agendamento"
          onCta={() => navigate('/schedules')}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0f1520]">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">Data/Hora</th>
                <th className="px-3 py-2 text-left">Schedule</th>
                <th className="px-3 py-2 text-left">Painel</th>
                <th className="px-3 py-2 text-left">Conexão</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Duração (ms)</th>
                <th className="px-3 py-2 text-left">Linhas</th>
                <th className="px-3 py-2 text-left">Erro</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <Fragment key={log.id}>
                  <tr className="cursor-pointer border-t border-white/5 hover:bg-white/5" onClick={() => setExpanded((prev) => prev === log.id ? null : log.id)}>
                    <td className="px-3 py-2">{new Date(log.executedAt).toLocaleString()}</td>
                    <td className="px-3 py-2">{log.scheduleId ? scheduleName[log.scheduleId] ?? log.scheduleId : '—'}</td>
                    <td className="px-3 py-2">{log.panelId ? panelName[log.panelId] ?? log.panelId : '—'}</td>
                    <td className="px-3 py-2">{log.connectionId ? connectionName[log.connectionId] ?? log.connectionId : '—'}</td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-xs ${log.status === 'success' ? 'bg-[var(--green)]/20 text-[var(--green)]' : 'bg-[var(--red)]/20 text-[var(--red)]'}`}>{log.status}</span></td>
                    <td className="px-3 py-2 font-mono">{log.durationMs ?? '—'}</td>
                    <td className="px-3 py-2 font-mono">{log.rowCount ?? '—'}</td>
                    <td className="px-3 py-2">{expanded === log.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</td>
                  </tr>
                  {expanded === log.id && log.errorMessage && (
                    <tr key={`${log.id}-err`} className="bg-black/20">
                      <td colSpan={8} className="px-3 py-2 text-xs text-[var(--red)]">{log.errorMessage}</td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          Mostrando {(page - 1) * 50 + 1}-{Math.min(page * 50, logsQuery.data?.total ?? 0)} de {logsQuery.data?.total ?? 0}
        </span>
        <div className="flex gap-2">
          <button className="btn-mini" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
          <button className="btn-mini" disabled={page >= (logsQuery.data?.totalPages ?? 1)} onClick={() => setPage((p) => p + 1)}>Próxima</button>
        </div>
      </div>
    </div>
  );
}
