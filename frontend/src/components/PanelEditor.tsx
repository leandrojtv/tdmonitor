import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, PlayCircle, Plus, Save, Wand2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, apiService } from '../services/api';
import { PanelDefinition, PanelFieldMapping } from '../types/panel';

type Props = {
  panel: PanelDefinition | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

type Tab = 'sql' | 'mapping' | 'preview';

const formatsByType: Record<string, string[]> = {
  number: ['decimal_1', 'decimal_2', 'integer', 'percent', 'bytes_to_gb', 'bytes_to_tb'],
  string: ['raw', 'truncate_500', 'uppercase'],
  date: ['iso', 'br'],
  datetime: ['iso', 'br']
};

const sqlKeywords = /(SELECT|FROM|WHERE|JOIN|GROUP BY|ORDER BY|HAVING|LEFT JOIN|RIGHT JOIN|INNER JOIN|OUTER JOIN|ON|LIMIT|TOP)/gi;

function toCamelCase(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)/g, (_, char) => char.toUpperCase())
    .replace(/^[^a-z]+/, '');
}

function inferType(value: unknown): 'number' | 'string' | 'date' | 'datetime' {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return 'datetime';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date';
  }
  return 'string';
}

function mapPreviewRows(rows: Record<string, unknown>[], mappings: PanelFieldMapping[]) {
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    mappings.forEach((m) => {
      out[m.target_field] = row[m.source_column];
    });
    return out;
  });
}

export function PanelEditor({ panel, open, onClose, onSaved }: Props) {
  const [tab, setTab] = useState<Tab>('sql');
  const [sqlQuery, setSqlQuery] = useState('');
  const [resultType, setResultType] = useState<'single_row' | 'table' | 'kpi'>('table');
  const [mappings, setMappings] = useState<PanelFieldMapping[]>([]);
  const [rawPreview, setRawPreview] = useState<Record<string, unknown>[]>([]);
  const [durationMs, setDurationMs] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);

  useEffect(() => {
    if (!panel) return;
    setSqlQuery(panel.sqlQuery);
    setResultType(panel.fieldMappings.result_type);
    setMappings(panel.fieldMappings.mappings);
    setTab('sql');
    setRawPreview([]);
    setDurationMs(0);
    setHasChanges(false);
  }, [panel]);

  const lineNumbers = useMemo(() => sqlQuery.split('\n').map((_, i) => i + 1).join('\n'), [sqlQuery]);
  const highlightedSql = useMemo(() => sqlQuery.replace(sqlKeywords, '<span class="sql-key">$1</span>'), [sqlQuery]);

  if (!open || !panel) return null;
  const currentPanel = panel;

  async function handleValidate() {
    setLoading(true);
    try {
      await api.post(`/panels/${currentPanel.id}/validate-sql`, { sql: sqlQuery });
      toast.success('SQL válido');
    } finally {
      setLoading(false);
    }
  }

  async function handlePreview() {
    setLoading(true);
    try {
      const response = await api.post(`/panels/${currentPanel.id}/preview`);
      const data = response.data.data;
      setRawPreview(data.rows ?? []);
      setDurationMs(data.duration_ms ?? 0);
      setTab('preview');
    } finally {
      setLoading(false);
    }
  }

  function formatSql() {
    const formatted = sqlQuery
      .replace(/\s+/g, ' ')
      .replace(/\b(FROM|WHERE|GROUP BY|ORDER BY|HAVING|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|OUTER JOIN)\b/gi, '\n$1')
      .trim();
    setSqlQuery(formatted);
    setHasChanges(true);
  }

  async function autoDetectFields() {
    setLoading(true);
    try {
      const response = await api.post(`/panels/${currentPanel.id}/preview`);
      const rows = response.data.data.rows ?? [];
      if (!rows.length) {
        toast('Sem linhas para detectar campos');
        return;
      }

      const first = rows[0];
      const auto = Object.keys(first).map<PanelFieldMapping>((column) => {
        const type = inferType(first[column]);
        return {
          source_column: column,
          target_field: toCamelCase(column) || column,
          data_type: type,
          format: type === 'number' ? 'decimal_2' : type === 'string' ? 'raw' : 'iso',
          label: column
        };
      });

      setMappings(auto);
      setHasChanges(true);
      toast.success('Campos detectados automaticamente');
    } finally {
      setLoading(false);
    }
  }

  async function save(executeAfterSave = false) {
    setLoading(true);
    try {
      await apiService.updatePanel(currentPanel.id, {
        sqlQuery,
        fieldMappings: { result_type: resultType, mappings }
      });

      if (executeAfterSave) {
        await apiService.executePanel(currentPanel.id);
      }

      toast.success(executeAfterSave ? 'Salvo e executado com sucesso' : 'Painel salvo com sucesso');
      setHasChanges(false);
      onSaved();
    } finally {
      setLoading(false);
    }
  }

  const mappedRows = mapPreviewRows(rawPreview, mappings);

  return (
    <div className="fixed inset-0 z-50 bg-black/80">
      <div className="h-full overflow-y-auto bg-[var(--bg-0)] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Editor de Painel · {panel.displayName}</h2>
          <button className="text-slate-400 hover:text-white" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          {([
            ['sql', 'SQL Query'],
            ['mapping', 'Mapeamento de Campos'],
            ['preview', 'Preview']
          ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-full px-4 py-2 text-sm ${tab === key ? 'bg-[var(--teal)]/20 text-[var(--teal)]' : 'bg-white/5 text-slate-300'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'sql' && (
          <div className="space-y-4 rounded-xl border border-white/10 bg-[#0f1520] p-4">
            <div className="flex gap-2">
              <button className="btn-editor" onClick={formatSql}><Wand2 size={14} /> Formatar SQL</button>
              <button className="btn-editor" onClick={handleValidate}><PlayCircle size={14} /> Validar SQL</button>
              <button className="btn-editor" onClick={handlePreview}><PlayCircle size={14} /> Preview (Top 10)</button>
              <span className="ml-auto text-xs text-slate-400">{sqlQuery.length} caracteres</span>
            </div>

            <div className="relative grid grid-cols-[48px_1fr] rounded-md border border-white/10 bg-[#0a0e14]">
              <pre className="m-0 border-r border-white/10 p-3 text-right text-xs text-slate-500">{lineNumbers}</pre>
              <div className="relative min-h-[300px]">
                <pre
                  className="pointer-events-none absolute inset-0 m-0 whitespace-pre-wrap p-3 font-mono text-sm text-slate-400"
                  dangerouslySetInnerHTML={{ __html: highlightedSql }}
                />
                <textarea
                  className="relative min-h-[300px] w-full resize-y bg-transparent p-3 font-mono text-sm text-transparent caret-[var(--teal)] outline-none"
                  value={sqlQuery}
                  onChange={(e) => {
                    setSqlQuery(e.target.value);
                    setHasChanges(true);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {tab === 'mapping' && (
          <div className="space-y-4 rounded-xl border border-white/10 bg-[#0f1520] p-4">
            <label className="text-xs text-slate-300">
              result_type
              <select
                className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                value={resultType}
                onChange={(e) => {
                  setResultType(e.target.value as typeof resultType);
                  setHasChanges(true);
                }}
              >
                <option value="single_row">single_row · resumo em card</option>
                <option value="table">table · tabela</option>
                <option value="kpi">kpi · cards KPI</option>
              </select>
            </label>

            <button className="btn-editor" onClick={autoDetectFields}><Wand2 size={14} /> Auto-detectar Campos</button>

            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="text-slate-400">
                  <tr>
                    <th className="p-2 text-left">Coluna SQL</th>
                    <th className="p-2 text-left">Campo Frontend</th>
                    <th className="p-2 text-left">Tipo</th>
                    <th className="p-2 text-left">Formato</th>
                    <th className="p-2 text-left">Label</th>
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((m, idx) => (
                    <tr key={idx} className="border-t border-white/5">
                      <td className="p-2"><input className="editor-input" value={m.source_column} onChange={(e) => {
                        const value = e.target.value;
                        setMappings((prev) => prev.map((row, i) => i === idx ? { ...row, source_column: value } : row));
                        setHasChanges(true);
                      }} /></td>
                      <td className="p-2"><input className="editor-input" value={m.target_field} onChange={(e) => {
                        const value = e.target.value;
                        setMappings((prev) => prev.map((row, i) => i === idx ? { ...row, target_field: value } : row));
                        setHasChanges(true);
                      }} /></td>
                      <td className="p-2">
                        <select className="editor-input" value={m.data_type} onChange={(e) => {
                          const value = e.target.value as PanelFieldMapping['data_type'];
                          setMappings((prev) => prev.map((row, i) => i === idx ? { ...row, data_type: value, format: formatsByType[value][0] } : row));
                          setHasChanges(true);
                        }}>
                          <option value="number">number</option>
                          <option value="string">string</option>
                          <option value="date">date</option>
                          <option value="datetime">datetime</option>
                        </select>
                      </td>
                      <td className="p-2">
                        <select className="editor-input" value={m.format ?? ''} onChange={(e) => {
                          const value = e.target.value;
                          setMappings((prev) => prev.map((row, i) => i === idx ? { ...row, format: value } : row));
                          setHasChanges(true);
                        }}>
                          {(formatsByType[m.data_type] ?? []).map((fmt) => <option key={fmt} value={fmt}>{fmt}</option>)}
                        </select>
                      </td>
                      <td className="p-2"><input className="editor-input" value={m.label ?? ''} onChange={(e) => {
                        const value = e.target.value;
                        setMappings((prev) => prev.map((row, i) => i === idx ? { ...row, label: value } : row));
                        setHasChanges(true);
                      }} /></td>
                      <td className="p-2 text-right"><button className="text-[var(--red)]" onClick={() => {
                        setMappings((prev) => prev.filter((_, i) => i !== idx));
                        setHasChanges(true);
                      }}>Remover</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button className="btn-editor" onClick={() => {
              setMappings((prev) => [...prev, { source_column: '', target_field: '', data_type: 'string', format: 'raw', label: '' }]);
              setHasChanges(true);
            }}>
              <Plus size={14} /> Adicionar Campo
            </button>
          </div>
        )}

        {tab === 'preview' && (
          <div className="space-y-4 rounded-xl border border-white/10 bg-[#101722] p-4">
            <button className="btn-editor" onClick={handlePreview}><PlayCircle size={14} /> Executar Preview</button>
            <p className="text-xs text-slate-400">Duração: {durationMs}ms · Linhas: {rawPreview.length} · {new Date().toLocaleString()}</p>

            {resultType === 'kpi' && (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {Object.entries(mappedRows[0] ?? {}).map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-[var(--teal)]/30 bg-[#0f1520] p-3">
                    <p className="text-xs text-slate-400">{k}</p>
                    <p className="font-mono text-lg text-[var(--teal)]">{String(v)}</p>
                  </div>
                ))}
              </div>
            )}

            {resultType === 'single_row' && (
              <div className="rounded-lg border border-white/10 bg-[#0f1520] p-4 text-sm">
                {Object.entries(mappedRows[0] ?? {}).map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-white/5 py-1">
                    <span className="text-slate-400">{k}</span>
                    <span className="font-mono">{String(v)}</span>
                  </div>
                ))}
              </div>
            )}

            {resultType === 'table' && (
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="min-w-full text-xs">
                  <thead><tr>{Object.keys(mappedRows[0] ?? {}).map((k) => <th key={k} className="p-2 text-left text-slate-400">{k}</th>)}</tr></thead>
                  <tbody>
                    {mappedRows.map((row, idx) => (
                      <tr key={idx} className="border-t border-white/5">
                        {Object.entries(row).map(([k, v]) => <td key={k} className="p-2 font-mono">{String(v)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button className="flex items-center gap-2 text-sm text-slate-300" onClick={() => setJsonOpen((v) => !v)}>
              <ChevronDown size={16} className={jsonOpen ? 'rotate-180' : ''} /> JSON bruto
            </button>
            {jsonOpen && (
              <pre className="max-h-80 overflow-auto rounded bg-black/40 p-3 text-xs text-slate-300">
                {JSON.stringify(rawPreview, null, 2)}
              </pre>
            )}
          </div>
        )}

        <div className="sticky bottom-0 mt-6 flex items-center gap-2 border-t border-white/10 bg-[var(--bg-0)]/95 p-4 backdrop-blur">
          <button className="rounded border border-white/15 px-3 py-2 text-sm" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={() => save(false)}><Save size={14} /> Salvar</button>
          <button className="btn-primary" onClick={() => save(true)}><PlayCircle size={14} /> Salvar e Executar</button>
          {hasChanges && <span className="ml-auto inline-flex items-center gap-2 text-xs text-[var(--amber)]"><span className="h-2 w-2 rounded-full bg-[var(--amber)]" /> Alterações não salvas</span>}
          {loading && <span className="text-xs text-slate-400">Processando...</span>}
        </div>
      </div>
    </div>
  );
}
