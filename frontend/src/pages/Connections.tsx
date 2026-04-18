import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit3, Loader2, Plus, TestTube2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConnectionForm } from '../components/ConnectionForm';
import { ConnectionTester } from '../components/ConnectionTester';
import { ConfirmModal } from '../components/ConfirmModal';
import { ApiErrorState, EmptyState } from '../components/ApiState';
import { apiService } from '../services/api';
import { ConnectionPayload, TeradataConnection } from '../types/connection';

export function ConnectionsPage() {
  const queryClient = useQueryClient();
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<TeradataConnection | null>(null);
  const [inlineTestingId, setInlineTestingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<TeradataConnection | null>(null);

  const connectionsQuery = useQuery({
    queryKey: ['connections'],
    queryFn: apiService.getConnections
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: ConnectionPayload) => {
      if (editing) return apiService.updateConnection(editing.id, payload);
      return apiService.createConnection(payload);
    },
    onSuccess: () => {
      toast.success('Conexão salva com sucesso');
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteConnection(id),
    onSuccess: () => {
      toast.success('Conexão excluída');
      setDeleting(null);
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    }
  });

  const names = useMemo(() => (connectionsQuery.data ?? []).map((item) => item.name), [connectionsQuery.data]);

  function statusDot(item: TeradataConnection) {
    if (item.lastTestSuccess === true) return 'bg-[var(--green)]';
    if (item.lastTestSuccess === false) return 'bg-[var(--red)]';
    return 'bg-slate-500';
  }

  if (connectionsQuery.isError) {
    return <ApiErrorState title="Erro ao carregar conexões" description="Não foi possível acessar a API." onRetry={() => connectionsQuery.refetch()} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Conexões Teradata</h2>
        <button
          className="flex items-center gap-2 rounded-md border border-[var(--teal)]/50 bg-[var(--teal)]/15 px-3 py-2 text-sm text-[var(--teal)]"
          onClick={() => {
            setEditing(null);
            setOpenForm(true);
          }}
        >
          <Plus size={16} /> Nova Conexão
        </button>
      </div>

      {connectionsQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded bg-white/5" />)}
        </div>
      ) : (connectionsQuery.data ?? []).length === 0 ? (
        <EmptyState title="Nenhuma conexão configurada" description="Crie a primeira conexão para iniciar a coleta." ctaLabel="Criar primeira conexão" onCta={() => { setEditing(null); setOpenForm(true); }} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0f1520]">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-left">Host:Porta</th>
                <th className="px-4 py-3 text-left">Database</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Último Teste</th>
                <th className="px-4 py-3 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(connectionsQuery.data ?? []).map((item) => (
                <tr key={item.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{item.host}:{item.port}</td>
                  <td className="px-4 py-3">{item.databaseName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex h-2.5 w-2.5 rounded-full ${statusDot(item)}`} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {item.lastTestAt ? `${new Date(item.lastTestAt).toLocaleString()} · ${item.lastTestSuccess ? 'OK' : 'Erro'}` : 'Nunca testado'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded border border-white/15 p-2 text-slate-200"
                        onClick={() => {
                          setEditing(item);
                          setOpenForm(true);
                        }}
                      >
                        <Edit3 size={14} />
                      </button>

                      <button
                        className="rounded border border-[var(--teal)]/40 p-2 text-[var(--teal)]"
                        onClick={() => setInlineTestingId((prev) => (prev === item.id ? null : item.id))}
                      >
                        <TestTube2 size={14} />
                      </button>

                      <button
                        className="rounded border border-[var(--red)]/40 p-2 text-[var(--red)]"
                        onClick={() => setDeleting(item)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {inlineTestingId === item.id && (
                      <div className="mt-2">
                        <ConnectionTester
                          connectionId={item.id}
                          buttonLabel="Testar"
                          onResult={() => queryClient.invalidateQueries({ queryKey: ['connections'] })}
                        />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConnectionForm
        open={openForm}
        existingNames={names}
        initialData={editing}
        onClose={() => setOpenForm(false)}
        onSave={(payload) => saveMutation.mutateAsync(payload)}
      />

      <ConfirmModal
        open={Boolean(deleting)}
        title="Excluir conexão"
        message={`Tem certeza que deseja excluir a conexão "${deleting?.name ?? ''}"?`}
        loading={deleteMutation.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />

      {(saveMutation.isPending || deleteMutation.isPending) && (
        <div className="fixed bottom-4 right-4 inline-flex items-center gap-2 rounded-md bg-black/70 px-3 py-2 text-xs text-slate-200">
          <Loader2 className="animate-spin" size={14} /> Processando...
        </div>
      )}
    </div>
  );
}
