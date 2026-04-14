import { useMemo, useState, type ComponentType } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Database, Lock, PanelTop, PlayCircle, Search, Shield, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { PanelEditor } from '../components/PanelEditor';
import { apiService } from '../services/api';
import { PanelDefinition } from '../types/panel';

const categoryLabels: Record<string, string> = {
  storage: 'Storage',
  performance: 'Performance',
  security: 'Segurança',
  sessions: 'Sessões',
  access: 'Acesso'
};

const categoryIcons: Record<string, ComponentType<{ size?: string | number }>> = {
  storage: Database,
  performance: Activity,
  security: Shield,
  sessions: PanelTop,
  access: Lock
};

export function PanelsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<PanelDefinition | null>(null);

  const panelsQuery = useQuery({ queryKey: ['panels'], queryFn: () => apiService.getPanels() });
  const dashboardQuery = useQuery({ queryKey: ['dashboard-data'], queryFn: apiService.getDashboardData });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isEnabled }: { id: string; isEnabled: boolean }) => apiService.togglePanel(id, isEnabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['panels'] })
  });

  const executeMutation = useMutation({
    mutationFn: (id: string) => apiService.executePanel(id),
    onSuccess: () => {
      toast.success('Painel executado');
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
    }
  });

  const grouped = useMemo(() => {
    const list = panelsQuery.data ?? [];
    const filtered = list.filter((panel) => {
      const passesFilter = filter === 'all' || panel.category === filter;
      const term = search.toLowerCase();
      const passesSearch = panel.displayName.toLowerCase().includes(term) || panel.panelKey.toLowerCase().includes(term);
      return passesFilter && passesSearch;
    });

    return filtered.reduce<Record<string, PanelDefinition[]>>((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});
  }, [filter, panelsQuery.data, search]);

  const executions = useMemo(() => {
    const map: Record<string, { executedAt: string | null }> = {};
    Object.values(dashboardQuery.data ?? {}).flat().forEach((entry) => {
      map[entry.panelId] = { executedAt: entry.executedAt };
    });
    return map;
  }, [dashboardQuery.data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {['all', 'storage', 'performance', 'security', 'sessions', 'access'].map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`rounded-full px-3 py-1 text-xs ${filter === c ? 'bg-[var(--teal)]/20 text-[var(--teal)]' : 'bg-white/5 text-slate-300'}`}
            >
              {c === 'all' ? 'Todos' : categoryLabels[c]}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search size={14} className="absolute left-2 top-2.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou panel_key"
            className="rounded-md border border-white/15 bg-[#0f1520] py-2 pl-8 pr-3 text-sm"
          />
        </div>
      </div>

      {Object.entries(grouped).map(([category, panels]) => {
        const Icon = categoryIcons[category] ?? PanelTop;
        return (
          <section key={category} className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200"><Icon size={16} /> {categoryLabels[category] ?? category}</h3>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {panels.map((panel) => {
                const exec = executions[panel.id];
                return (
                  <article key={panel.id} className="rounded-xl border border-white/10 bg-[#0f1520] p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <p className="font-mono text-xs text-[var(--teal)]">{panel.panelKey}</p>
                        <h4 className="text-sm text-white">{panel.displayName}</h4>
                      </div>
                      <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] uppercase text-slate-300">{panel.fieldMappings.result_type}</span>
                    </div>

                    <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
                      <span>Última execução: {exec?.executedAt ? `${Math.max(1, Math.floor((Date.now() - new Date(exec.executedAt).getTime()) / 60000))} min` : 'Nunca'}</span>
                      <button
                        onClick={() => toggleMutation.mutate({ id: panel.id, isEnabled: !panel.isEnabled })}
                        className={panel.isEnabled ? 'text-[var(--green)]' : 'text-slate-500'}
                      >
                        {panel.isEnabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button className="btn-mini" onClick={() => setEditing(panel)}>Editar</button>
                      <button className="btn-mini" onClick={() => executeMutation.mutate(panel.id)}><PlayCircle size={14} /> Executar Agora</button>
                      <button className="btn-mini" onClick={async () => {
                        await apiService.previewPanel(panel.id);
                        toast.success('Preview executado');
                      }}>Preview</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}

      <PanelEditor
        panel={editing}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['panels'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
        }}
      />
    </div>
  );
}
