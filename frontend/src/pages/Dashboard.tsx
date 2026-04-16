import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiService } from '../services/api';

const tabs = ['overview', 'storage', 'performance', 'security', 'sessions', 'access'] as const;

type TabKey = (typeof tabs)[number];

const tabLabels: Record<TabKey, string> = {
  overview: 'Overview',
  storage: 'Storage',
  performance: 'Performance',
  security: 'Segurança',
  sessions: 'Sessões',
  access: 'Acesso'
};

const categoryMap: Record<TabKey, string[]> = {
  overview: ['storage', 'performance', 'security', 'sessions', 'access'],
  storage: ['storage'],
  performance: ['performance'],
  security: ['security'],
  sessions: ['sessions'],
  access: ['access']
};

export function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const dashboardQuery = useQuery({
    queryKey: ['dashboard-data'],
    queryFn: apiService.getDashboardData,
    refetchInterval: 60000
  });

  const scheduleQuery = useQuery({
    queryKey: ['schedules'],
    queryFn: apiService.getSchedules
  });

  useEffect(() => {
    if (dashboardQuery.data) {
      localStorage.setItem('dashboard_last_updated', new Date().toISOString());
      window.dispatchEvent(new Event('dashboard-updated'));
    }
  }, [dashboardQuery.data]);

  useEffect(() => {
    const handler = async () => {
      try {
        const firstActiveSchedule = scheduleQuery.data?.find((s) => s.isEnabled);

        if (!firstActiveSchedule) {
          toast.error('Nenhum schedule ativo encontrado.');
          return;
        }

        await apiService.runSchedule(firstActiveSchedule.id);
        toast.success('Schedule executado com sucesso.');
        dashboardQuery.refetch();
      } catch {
        // erro tratado no interceptor
      }
    };

    window.addEventListener('refresh-now', handler);
    return () => window.removeEventListener('refresh-now', handler);
  }, [dashboardQuery, scheduleQuery.data]);

  const panelList = useMemo(() => {
    const data = dashboardQuery.data ?? {};
    const categories = categoryMap[activeTab];
    return categories.flatMap((category) => data[category] ?? []);
  }, [activeTab, dashboardQuery.data]);

  const lastExecuted = useMemo(() => {
    const all = Object.values(dashboardQuery.data ?? {}).flat();
    const dates = all
      .map((item) => (item.executedAt ? new Date(item.executedAt).getTime() : 0))
      .filter((v) => v > 0);

    if (!dates.length) return null;
    return new Date(Math.max(...dates));
  }, [dashboardQuery.data]);

  const statusColor = useMemo(() => {
    if (!lastExecuted) return 'bg-[#f87171]';
    const diffMin = (Date.now() - lastExecuted.getTime()) / 60000;
    if (diffMin < 15) return 'bg-[#34d399]';
    if (diffMin < 60) return 'bg-[#fbbf24]';
    return 'bg-[#f87171]';
  }, [lastExecuted]);

  const isEmpty = !dashboardQuery.isLoading && panelList.length === 0;

  function renderPanelContent(panel: (typeof panelList)[number]) {
    const resultType = panel.data?.result_type ?? 'table';
    const rows = panel.data?.rows ?? [];

    if (resultType === 'kpi') {
      return (
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(rows[0] ?? {}).map(([k, v]) => (
            <div key={k} className="rounded bg-white/5 p-2">
              <p className="text-[10px] text-slate-400">{k}</p>
              <p className="font-mono text-sm text-[var(--teal)]">{String(v)}</p>
            </div>
          ))}
        </div>
      );
    }

    if (resultType === 'single_row') {
      return (
        <div className="space-y-1 text-xs">
          {Object.entries(rows[0] ?? {}).map(([k, v]) => (
            <div key={k} className="flex justify-between rounded bg-white/5 px-2 py-1">
              <span className="text-slate-400">{k}</span>
              <span className="font-mono">{String(v)}</span>
            </div>
          ))}
        </div>
      );
    }

    if (resultType === 'bar_chart') {
      return (
        <div className="space-y-2">
          {rows.slice(0, 8).map((row, idx) => {
            const [x, y] = Object.values(row);
            const value = Number(y ?? 0);
            const width = Math.max(4, Math.min(100, Number.isFinite(value) ? value : 0));
            return (
              <div key={idx}>
                <div className="mb-1 flex justify-between text-[11px] text-slate-300">
                  <span>{String(x ?? `Item ${idx + 1}`)}</span>
                  <span>{Number.isFinite(value) ? value : 0}</span>
                </div>
                <div className="h-2 rounded bg-white/10">
                  <div className="h-2 rounded bg-[var(--teal)]" style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (resultType === 'line_chart') {
      const points = rows.slice(0, 12)
        .map((row, idx) => {
          const value = Number(Object.values(row)[1] ?? 0);
          const y = Number.isFinite(value) ? value : 0;
          return `${10 + idx * 25},${110 - Math.max(0, Math.min(100, y))}`;
        })
        .join(' ');

      return (
        <svg viewBox="0 0 320 120" className="h-24 w-full">
          <polyline fill="none" stroke="var(--teal)" strokeWidth="2" points={points} />
        </svg>
      );
    }

    return (
      <div className="overflow-x-auto rounded-md border border-white/10">
        <table className="min-w-full text-xs">
          <thead>
            <tr>
              {Object.keys(rows[0] ?? {}).map((k) => (
                <th key={k} className="px-2 py-1 text-left text-slate-400">{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 5).map((row, idx) => (
              <tr key={idx} className="border-t border-white/5">
                {Object.entries(row).map(([k, v]) => (
                  <td key={k} className="px-2 py-1 font-mono">{String(v)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
          <p className="text-sm text-slate-300">
            {lastExecuted ? `Última coleta: ${lastExecuted.toLocaleString()}` : 'Sem dados coletados'}
          </p>
        </div>
        <button
          onClick={() => window.dispatchEvent(new Event('refresh-now'))}
          className="flex items-center gap-2 rounded-lg border border-[var(--teal)]/40 bg-[var(--teal)]/10 px-3 py-2 text-sm text-[var(--teal)]"
        >
          <RefreshCw size={16} /> Atualizar Agora
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-4 py-2 text-sm transition ${
              activeTab === tab ? 'bg-[var(--teal)]/20 text-[var(--teal)]' : 'bg-white/5 text-slate-300'
            }`}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {dashboardQuery.isLoading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-40 animate-pulse rounded-xl border border-white/10 bg-white/5" />
          ))}
        </div>
      )}

      {isEmpty && (
        <div className="rounded-xl border border-dashed border-white/20 p-12 text-center">
          <p className="text-lg font-semibold text-white">Nenhum dado disponível</p>
          <p className="mt-2 text-sm text-slate-400">Configure uma conexão e execute os painéis.</p>
        </div>
      )}

      {!dashboardQuery.isLoading && !isEmpty && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {panelList.map((panel) => (
            <article key={panel.panelId} className="panel-card rounded-xl border border-[var(--teal)]/30 bg-[#111827] p-4">
              <header className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-100">{panel.displayName}</h3>
                <span className="rounded-full bg-[var(--teal)]/15 px-2 py-1 text-xs text-[var(--teal)]">{panel.rowCount} rows</span>
              </header>

              <div className="gauge-wrap">
                <svg viewBox="0 0 120 70" className="h-16 w-full">
                  <path d="M10 60 A50 50 0 0 1 110 60" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
                  <path d="M10 60 A50 50 0 0 1 110 60" stroke="var(--teal)" strokeWidth="8" fill="none" strokeDasharray="130" strokeDashoffset="35" />
                </svg>
              </div>

              <div className="space-y-2 font-mono text-xs text-slate-300">
                {renderPanelContent(panel)}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
