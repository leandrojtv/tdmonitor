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
                {(panel.data?.rows ?? []).slice(0, 3).map((row, idx) => (
                  <div key={idx} className="rounded-md bg-white/5 p-2 hover:bg-white/10">
                    {Object.entries(row).slice(0, 2).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between gap-2">
                        <span className="text-slate-400">{k}</span>
                        <span className="truncate">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
