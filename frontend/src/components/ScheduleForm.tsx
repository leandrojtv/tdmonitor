import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, PlayCircle, X } from 'lucide-react';
import { CronBuilder } from './CronBuilder';
import { TeradataConnection } from '../types/connection';
import { PanelDefinition } from '../types/panel';
import { Schedule } from '../types/schedule';

type Props = {
  open: boolean;
  schedule?: Schedule | null;
  connections: TeradataConnection[];
  panels: PanelDefinition[];
  onClose: () => void;
  onSave: (payload: Pick<Schedule, 'connectionId' | 'name' | 'cronExpression' | 'panelIds'>) => Promise<void>;
  onRunNow?: () => Promise<void>;
};

export function ScheduleForm({ open, schedule, connections, panels, onClose, onSave, onRunNow }: Props) {
  const [name, setName] = useState('');
  const [connectionId, setConnectionId] = useState('');
  const [cronExpression, setCronExpression] = useState('*/15 * * * *');
  const [selectedPanels, setSelectedPanels] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(schedule?.name ?? '');
    setConnectionId(schedule?.connectionId ?? (connections[0]?.id ?? ''));
    setCronExpression(schedule?.cronExpression ?? '*/15 * * * *');
    setSelectedPanels(schedule?.panelIds ?? []);
  }, [connections, open, schedule]);

  const groupedPanels = useMemo(
    () =>
      panels.reduce<Record<string, PanelDefinition[]>>((acc, panel) => {
        if (!acc[panel.category]) acc[panel.category] = [];
        acc[panel.category].push(panel);
        return acc;
      }, {}),
    [panels]
  );

  if (!open) return null;

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({ name, connectionId, cronExpression, panelIds: selectedPanels });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70">
      <div className="absolute right-0 top-0 h-full w-full max-w-[560px] overflow-y-auto border-l border-white/10 bg-[#0f1520] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{schedule ? 'Editar Schedule' : 'Novo Schedule'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>

        <div className="space-y-4 pb-24">
          <label className="block text-xs text-slate-300">
            Nome
            <input className="editor-input mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <label className="block text-xs text-slate-300">
            Conexão Teradata
            <select className="editor-input mt-1" value={connectionId} onChange={(e) => setConnectionId(e.target.value)}>
              {connections.map((c) => (
                <option key={c.id} value={c.id}>{c.name} {c.lastTestSuccess ? '🟢' : c.lastTestSuccess === false ? '🔴' : '⚪'}</option>
              ))}
            </select>
          </label>

          <CronBuilder value={cronExpression} onChange={setCronExpression} />

          <div className="rounded-md border border-white/10 p-3">
            <p className="mb-2 text-xs text-slate-300">Painéis a executar</p>
            {Object.entries(groupedPanels).map(([category, items]) => (
              <div key={category} className="mb-3">
                <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                  <span>{category}</span>
                  <div className="flex gap-2">
                    <button type="button" className="text-[var(--teal)]" onClick={() => setSelectedPanels((prev) => Array.from(new Set([...prev, ...items.map((p) => p.id)])))}>Selecionar todos</button>
                    <button type="button" className="text-[var(--red)]" onClick={() => setSelectedPanels((prev) => prev.filter((id) => !items.some((p) => p.id === id)))}>Limpar</button>
                  </div>
                </div>
                <div className="space-y-1">
                  {items.map((panel) => {
                    const checked = selectedPanels.includes(panel.id);
                    return (
                      <div key={panel.id} className="flex items-center gap-2 text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedPanels((prev) => [...prev, panel.id]);
                            else setSelectedPanels((prev) => prev.filter((id) => id !== panel.id));
                          }}
                        />
                        <span className="font-mono text-[11px] text-[var(--teal)]">{panel.panelKey}</span>
                        <span className="flex-1">{panel.displayName}</span>
                        {checked && (
                          <>
                            <button
                              type="button"
                              className="text-slate-400"
                              onClick={() => {
                                setSelectedPanels((prev) => {
                                  const idx = prev.indexOf(panel.id);
                                  if (idx <= 0) return prev;
                                  const clone = [...prev];
                                  [clone[idx - 1], clone[idx]] = [clone[idx], clone[idx - 1]];
                                  return clone;
                                });
                              }}
                            ><ArrowUp size={12} /></button>
                            <button
                              type="button"
                              className="text-slate-400"
                              onClick={() => {
                                setSelectedPanels((prev) => {
                                  const idx = prev.indexOf(panel.id);
                                  if (idx < 0 || idx === prev.length - 1) return prev;
                                  const clone = [...prev];
                                  [clone[idx + 1], clone[idx]] = [clone[idx], clone[idx + 1]];
                                  return clone;
                                });
                              }}
                            ><ArrowDown size={12} /></button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {onRunNow && (
            <button type="button" className="btn-editor" onClick={onRunNow}><PlayCircle size={14} /> Executar Agora</button>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 flex gap-2 border-t border-white/10 bg-[#0f1520] p-4">
          <button className="flex-1 rounded border border-white/15 px-3 py-2 text-sm" onClick={onClose}>Cancelar</button>
          <button className="flex-1 rounded border border-[var(--teal)]/50 bg-[var(--teal)]/20 px-3 py-2 text-sm text-[var(--teal)]" onClick={handleSave} disabled={saving || !name || !connectionId || !selectedPanels.length}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
