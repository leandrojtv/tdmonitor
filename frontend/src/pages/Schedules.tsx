import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, CheckCircle2, PlayCircle, Plus, ScrollText, ToggleLeft, ToggleRight, Trash2, XCircle } from 'lucide-react';
import parser from 'cron-parser';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ScheduleForm } from '../components/ScheduleForm';
import { ConfirmModal } from '../components/ConfirmModal';
import { ApiErrorState, EmptyState } from '../components/ApiState';
import { cronToPortuguese } from '../components/CronBuilder';
import { apiService } from '../services/api';
import { Schedule } from '../types/schedule';

function nextExecution(cron: string) {
  try {
    return parser.parseExpression(cron).next().toDate();
  } catch {
    return null;
  }
}

export function SchedulesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Schedule | null>(null);

  const schedulesQuery = useQuery({ queryKey: ['schedules'], queryFn: apiService.getSchedules });
  const connectionsQuery = useQuery({ queryKey: ['connections'], queryFn: apiService.getConnections });
  const panelsQuery = useQuery({ queryKey: ['panels'], queryFn: () => apiService.getPanels() });

  const saveMutation = useMutation({
    mutationFn: async (payload: Pick<Schedule, 'connectionId' | 'name' | 'cronExpression' | 'panelIds'>) => {
      if (editing) return apiService.updateSchedule(editing.id, payload);
      return apiService.createSchedule(payload);
    },
    onSuccess: () => {
      toast.success('Schedule salvo');
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    }
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isEnabled }: { id: string; isEnabled: boolean }) => apiService.toggleSchedule(id, isEnabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedules'] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteSchedule(id),
    onSuccess: () => {
      toast.success('Schedule excluído');
      setDeleting(null);
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    }
  });

  const runMutation = useMutation({
    mutationFn: (id: string) => apiService.runSchedule(id),
    onSuccess: () => {
      toast.success('Schedule executado');
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    }
  });

  const connectionNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    (connectionsQuery.data ?? []).forEach((c) => (map[c.id] = c.name));
    return map;
  }, [connectionsQuery.data]);

  if (schedulesQuery.isError) {
    return <ApiErrorState title="Erro ao carregar agendamentos" description="A API está indisponível no momento." onRetry={() => schedulesQuery.refetch()} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Agendamentos</h2>
        <button
          className="flex items-center gap-2 rounded-md border border-[var(--teal)]/50 bg-[var(--teal)]/15 px-3 py-2 text-sm text-[var(--teal)]"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus size={16} /> Novo Schedule
        </button>
      </div>

      {schedulesQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded bg-white/5" />)}
        </div>
      ) : (schedulesQuery.data ?? []).length === 0 ? (
        <EmptyState title="Nenhum agendamento configurado" description="Crie seu primeiro schedule para iniciar coletas automáticas." ctaLabel="Criar agendamento" onCta={() => { setEditing(null); setOpen(true); }} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(schedulesQuery.data ?? []).map((schedule) => {
            const nextRun = nextExecution(schedule.cronExpression);
            const ok = schedule.lastRunStatus === 'success';
            const isError = schedule.lastRunStatus === 'error';
            const border = isError ? 'border-[var(--red)]/40' : schedule.isEnabled ? 'border-[var(--green)]/35' : 'border-[var(--amber)]/35';

            return (
              <article key={schedule.id} className={`rounded-xl border bg-[#0f1520] p-4 ${border}`}>
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{schedule.name}</h3>
                    <p className="font-mono text-xs text-[var(--teal)]">{schedule.cronExpression}</p>
                    <p className="text-xs text-slate-400">{cronToPortuguese(schedule.cronExpression)}</p>
                  </div>
                  <button
                    onClick={() => toggleMutation.mutate({ id: schedule.id, isEnabled: !schedule.isEnabled })}
                    className={schedule.isEnabled ? 'text-[var(--green)]' : 'text-[var(--amber)]'}
                  >
                    {schedule.isEnabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                </div>

                <div className="space-y-1 text-xs text-slate-300">
                  <p>Conexão: <span className="text-white">{connectionNameMap[schedule.connectionId] ?? schedule.connectionId}</span></p>
                  <p>Painéis vinculados: <span className="text-white">{schedule.panelIds.length}</span></p>
                  <p className="flex items-center gap-2">
                    {ok ? (
                      <CheckCircle2 size={14} className="text-[var(--green)]" />
                    ) : isError ? (
                      <XCircle size={14} className="text-[var(--red)]" />
                    ) : (
                      <CalendarClock size={14} className="text-slate-400" />
                    )}
                    Última execução: {schedule.lastRunAt ? new Date(schedule.lastRunAt).toLocaleString() : 'Nunca'}
                    {schedule.lastRunDurationMs ? ` (${schedule.lastRunDurationMs}ms)` : ''}
                  </p>
                  <p>Próxima execução: {nextRun ? nextRun.toLocaleString() : 'Cron inválido'}</p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn-mini" onClick={() => { setEditing(schedule); setOpen(true); }}>Editar</button>
                  <button className="btn-mini" onClick={() => runMutation.mutate(schedule.id)}><PlayCircle size={14} /> Executar Agora</button>
                  <button className="btn-mini" onClick={() => navigate('/logs')}><ScrollText size={14} /> Ver Logs</button>
                  <button className="btn-mini" onClick={() => setDeleting(schedule)}><Trash2 size={14} /> Excluir</button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleting)}
        title="Excluir agendamento"
        message={`Tem certeza que deseja excluir o schedule "${deleting?.name ?? ''}"?`}
        loading={deleteMutation.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />

      <ScheduleForm
        open={open}
        schedule={editing}
        connections={connectionsQuery.data ?? []}
        panels={panelsQuery.data ?? []}
        onClose={() => setOpen(false)}
        onSave={(payload) => saveMutation.mutateAsync(payload)}
        onRunNow={editing ? () => runMutation.mutateAsync(editing.id) : undefined}
      />
    </div>
  );
}
