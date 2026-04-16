import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, LineChart, RefreshCw, Table2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiService } from '../services/api';
import { DashboardPanelData } from '../types/dashboard';
import { PanelDefinition, PanelResultType, PanelWidgetConfig } from '../types/panel';

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

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number') return Number.isInteger(value) ? value.toString() : value.toFixed(2);
  return String(value);
}

function normalizeWidget(resultType: PanelResultType, widget?: PanelWidgetConfig) {
  const defaults: Record<PanelResultType, { col: 3 | 4 | 6 | 8 | 12; row: 1 | 2 | 3; minHeight: number }> = {
    kpi: { col: 4, row: 1, minHeight: 250 },
    single_row: { col: 4, row: 1, minHeight: 250 },
    table: { col: 6, row: 2, minHeight: 320 },
    bar_chart: { col: 6, row: 2, minHeight: 320 },
    line_chart: { col: 6, row: 2, minHeight: 320 }
  };

  const base = defaults[resultType];
  return {
    col: widget?.col_span ?? base.col,
    row: widget?.row_span ?? base.row,
    minHeight: widget?.min_height ?? base.minHeight,
    showHeader: widget?.show_header ?? true,
    showLegend: widget?.show_legend ?? true,
    showTable: widget?.show_table ?? false,
    color: widget?.color ?? 'var(--teal)',
    xField: widget?.x_field,
    yField: widget?.y_field
  };
}

function firstNumericKey(row: Record<string, unknown>) {
  return Object.keys(row).find((k) => typeof row[k] === 'number') ?? Object.keys(row)[1];
}

function PanelVisualization({ panel }: { panel: DashboardPanelData }) {
  const resultType = (panel.data?.result_type ?? 'table') as PanelResultType;
  const rows = panel.data?.rows ?? [];
  const columns = panel.data?.columns ?? [];
  const cfg = normalizeWidget(resultType, panel.data?.widget);

  if (!rows.length) {
    return <div className="rounded-lg border border-dashed border-white/15 p-6 text-center text-sm text-slate-400">Sem dados nesta execução.</div>;
  }

  if (resultType === 'kpi') {
    const row = rows[0] ?? {};
    return (
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(row).map(([key, value]) => (
          <div key={key} className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] text-slate-400">{columns.find((c) => c.target_field === key)?.label ?? key}</p>
            <p className="mt-1 font-mono text-lg text-[var(--teal)]">{formatCell(value)}</p>
          </div>
        ))}
      </div>
    );
  }

  if (resultType === 'single_row') {
    const row = rows[0] ?? {};
    return (
      <div className="space-y-1 rounded-lg border border-white/10 bg-white/5 p-3">
        {Object.entries(row).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between border-b border-white/10 py-1.5 text-sm last:border-0">
            <span className="text-slate-400">{columns.find((c) => c.target_field === key)?.label ?? key}</span>
            <span className="font-mono text-slate-100">{formatCell(value)}</span>
          </div>
        ))}
      </div>
    );
  }

  if (resultType === 'bar_chart') {
    const xKey = cfg.xField ?? Object.keys(rows[0])[0];
    const yKey = cfg.yField ?? firstNumericKey(rows[0]);
    const values = rows.map((r) => Number(r[yKey] ?? 0));
    const max = Math.max(1, ...values.filter((v) => Number.isFinite(v)));

    return (
      <div className="space-y-2">
        {cfg.showLegend && <div className="text-xs text-slate-400">{xKey} × {yKey}</div>}
        {rows.slice(0, 10).map((row, idx) => {
          const value = Number(row[yKey] ?? 0);
          const width = Math.max(3, (value / max) * 100);
          return (
            <div key={idx}>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                <span className="truncate pr-2">{formatCell(row[xKey])}</span>
                <span className="font-mono">{formatCell(value)}</span>
              </div>
              <div className="h-2 rounded bg-white/10">
                <div className="h-2 rounded" style={{ width: `${width}%`, backgroundColor: cfg.color }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (resultType === 'line_chart') {
    const xKey = cfg.xField ?? Object.keys(rows[0])[0];
    const yKey = cfg.yField ?? firstNumericKey(rows[0]);
    const values = rows.slice(0, 20).map((row) => Number(row[yKey] ?? 0));
    const max = Math.max(1, ...values.filter((v) => Number.isFinite(v)));
    const points = values.map((v, i) => `${12 + i * (296 / Math.max(1, values.length - 1))},${108 - ((v / max) * 92)}`).join(' ');

    return (
      <div>
        {cfg.showLegend && <div className="mb-2 text-xs text-slate-400">{xKey} × {yKey}</div>}
        <svg viewBox="0 0 320 120" className="h-36 w-full rounded bg-[#0a0e14] p-2">
          <path d="M10 108 L310 108" stroke="rgba(148,163,184,.3)" strokeWidth="1" />
          <polyline points={points} fill="none" stroke={cfg.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="min-w-full text-xs">
        <thead>
          <tr>
            {Object.keys(rows[0] ?? {}).map((k) => (
              <th key={k} className="px-3 py-2 text-left text-slate-400">{columns.find((c) => c.target_field === k)?.label ?? k}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 12).map((row, idx) => (
            <tr key={idx} className="border-t border-white/5 hover:bg-white/5">
              {Object.entries(row).map(([k, value]) => (
                <td key={k} className="px-3 py-2 font-mono text-slate-200">{formatCell(value)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const dashboardQuery = useQuery({ queryKey: ['dashboard-data'], queryFn: apiService.getDashboardData, refetchInterval: 60000 });
  const scheduleQuery = useQuery({ queryKey: ['schedules'], queryFn: apiService.getSchedules });
  const panelsQuery = useQuery({ queryKey: ['panels'], queryFn: () => apiService.getPanels() });

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
        if (!firstActiveSchedule) return toast.error('Nenhum schedule ativo encontrado.');
        await apiService.runSchedule(firstActiveSchedule.id);
        toast.success('Dashboard atualizado');
        dashboardQuery.refetch();
      } catch {
        // handled by interceptor
      }
    };

    window.addEventListener('refresh-now', handler);
    return () => window.removeEventListener('refresh-now', handler);
  }, [dashboardQuery, scheduleQuery.data]);

  const panelList = useMemo(() => {
    const data = dashboardQuery.data ?? {};
    const catalog = new Map<string, PanelDefinition>((panelsQuery.data ?? []).map((p) => [p.id, p]));

    return categoryMap[activeTab].flatMap((c) => (data[c] ?? []).map((cached) => {
      const latest = catalog.get(cached.panelId);
      if (!latest) return cached;
      return {
        ...cached,
        displayName: latest.displayName,
        panelKey: latest.panelKey,
        data: {
          ...(cached.data ?? {}),
          result_type: latest.fieldMappings?.result_type ?? cached.data?.result_type ?? 'table',
          widget: {
            ...(cached.data?.widget ?? {}),
            ...(latest.fieldMappings?.widget ?? {})
          }
        }
      };
    }));
  }, [activeTab, dashboardQuery.data, panelsQuery.data]);

  const lastExecuted = useMemo(() => {
    const dates = Object.values(dashboardQuery.data ?? {})
      .flat()
      .map((item) => (item.executedAt ? new Date(item.executedAt).getTime() : 0))
      .filter((v) => v > 0);
    return dates.length ? new Date(Math.max(...dates)) : null;
  }, [dashboardQuery.data]);

  const statusColor = useMemo(() => {
    if (!lastExecuted) return 'bg-[#f87171]';
    const diffMin = (Date.now() - lastExecuted.getTime()) / 60000;
    if (diffMin < 15) return 'bg-[#34d399]';
    if (diffMin < 60) return 'bg-[#fbbf24]';
    return 'bg-[#f87171]';
  }, [lastExecuted]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${statusColor} animate-pulse`} />
          <p className="text-sm text-slate-300">{lastExecuted ? `Última coleta: ${lastExecuted.toLocaleString()}` : 'Sem dados coletados'}</p>
        </div>
        <button onClick={() => window.dispatchEvent(new Event('refresh-now'))} className="btn-primary">
          <RefreshCw size={16} /> Atualizar Agora
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-full px-4 py-2 text-sm transition ${activeTab === tab ? 'bg-[var(--teal)]/20 text-[var(--teal)]' : 'bg-white/5 text-slate-300'}`}>
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {dashboardQuery.isLoading && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-xl border border-white/10 bg-white/5" />)}</div>}

      {!dashboardQuery.isLoading && panelList.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/20 p-12 text-center">
          <p className="text-lg font-semibold text-white">Nenhum dado disponível</p>
          <p className="mt-2 text-sm text-slate-400">Configure conexão, painéis e execute um agendamento.</p>
          <p className="mt-1 text-xs text-slate-500">Dica: após mudar SQL/mapeamento, use “Salvar e Executar” no painel para atualizar cache.</p>
        </div>
      )}

      {!dashboardQuery.isLoading && panelList.length > 0 && (
        <div className="dashboard-grid">
          {panelList.map((panel) => {
            const type = (panel.data?.result_type ?? 'table') as PanelResultType;
            const cfg = normalizeWidget(type, panel.data?.widget);
            return (
              <article
                key={panel.panelId}
                className="dashboard-widget rounded-xl border border-white/10 bg-[#0f1520] p-4"
                style={{ ['--col-span' as string]: String(cfg.col), ['--row-span' as string]: String(cfg.row), minHeight: `${cfg.minHeight}px` }}
              >
                {cfg.showHeader && (
                  <header className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100">{panel.displayName}</h3>
                      <p className="font-mono text-[11px] text-slate-500">{panel.panelKey}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[10px] uppercase text-slate-300">
                      {type === 'table' && <Table2 size={12} />}
                      {type === 'bar_chart' && <BarChart3 size={12} />}
                      {type === 'line_chart' && <LineChart size={12} />}
                      {type.replace('_', ' ')}
                    </span>
                  </header>
                )}

                <PanelVisualization panel={panel} />

                <footer className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{panel.rowCount} rows</span>
                  <span>{panel.durationMs} ms</span>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
