import { useMemo, useState } from 'react';
import { Eye, EyeOff, Plus, Trash2, X } from 'lucide-react';
import { ConnectionPayload, TeradataConnection } from '../types/connection';
import { ConnectionTester } from './ConnectionTester';

type Props = {
  open: boolean;
  existingNames: string[];
  initialData?: TeradataConnection | null;
  onClose: () => void;
  onSave: (payload: ConnectionPayload) => Promise<void>;
};

type ParamEntry = { key: string; value: string };

const suggestedParams = ['CHARSET=UTF8', 'TMODE=ANSI', 'LOG=TIMING'];

export function ConnectionForm({ open, existingNames, initialData, onClose, onSave }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(initialData?.name ?? '');
  const [host, setHost] = useState(initialData?.host ?? '');
  const [port, setPort] = useState(initialData?.port ?? 1025);
  const [username, setUsername] = useState(initialData?.username ?? '');
  const [password, setPassword] = useState('');
  const [databaseName, setDatabaseName] = useState(initialData?.databaseName ?? '');
  const [params, setParams] = useState<ParamEntry[]>(
    Object.entries(initialData?.jdbcParams ?? {}).map(([key, value]) => ({ key, value }))
  );

  if (!open) return null;

  const validationError = useMemo(() => {
    if (!name.trim()) return 'Nome é obrigatório';
    const duplicated = existingNames.includes(name.trim()) && name.trim() !== (initialData?.name ?? '');
    if (duplicated) return 'Nome deve ser único';
    if (!host.trim() || host.includes(' ')) return 'Host obrigatório e sem espaços';
    if (!username.trim()) return 'Usuário obrigatório';
    if (!password.trim()) return 'Senha obrigatória';
    if (Number.isNaN(port) || port < 1 || port > 65535) return 'Porta deve estar entre 1 e 65535';
    return null;
  }, [databaseName, existingNames, host, initialData?.name, name, password, port, username]);

  const jdbcParamsObject = params.reduce<Record<string, string>>((acc, item) => {
    if (item.key.trim()) {
      acc[item.key.trim()] = item.value.trim();
    }
    return acc;
  }, {});

  const jdbcPreview = useMemo(() => {
    const extras = Object.entries(jdbcParamsObject)
      .map(([k, v]) => `${k}=${v}`)
      .join(',');

    return `jdbc:teradata://${host || '{host}'}/DATABASE=${databaseName || '{database}'},DBS_PORT=${port}${extras ? `,${extras}` : ''}`;
  }, [databaseName, host, jdbcParamsObject, port]);

  async function handleSave() {
    if (validationError) return;

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        host: host.trim(),
        port,
        username: username.trim(),
        password,
        databaseName: databaseName.trim() || null,
        jdbcParams: jdbcParamsObject
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70">
      <div className="absolute right-0 top-0 h-full w-full max-w-[480px] animate-[slideIn_.2s_ease-out] border-l border-white/10 bg-[#0f1520] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{initialData ? 'Editar Conexão' : 'Nova Conexão'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto pb-24">
          <Input label="Nome da Conexão" value={name} onChange={setName} />
          <Input label="Host" value={host} onChange={setHost} placeholder="tdserver.empresa.com.br" />
          <Input label="Porta" type="number" value={String(port)} onChange={(v) => setPort(Number(v))} />
          <Input label="Usuário" value={username} onChange={setUsername} />

          <label className="block text-xs text-slate-300">
            Senha
            <div className="mt-1 flex rounded-md border border-[var(--border)] bg-[var(--surface-2)]">
              <input
                className="w-full bg-transparent px-3 py-2 text-sm text-white outline-none"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button className="px-3 text-slate-300" onClick={() => setShowPassword((v) => !v)} type="button">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          <Input label="Database Padrão" value={databaseName} onChange={setDatabaseName} />

          <div className="space-y-2 rounded-md border border-white/10 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-300">Parâmetros JDBC Extras</p>
              <button
                type="button"
                className="text-xs text-[var(--teal)]"
                onClick={() => setParams((prev) => [...prev, { key: '', value: '' }])}
              >
                <Plus size={14} className="inline" /> Adicionar Parâmetro
              </button>
            </div>
            <p className="text-[11px] text-slate-500">Sugestões: {suggestedParams.join(' · ')}</p>

            {params.map((item, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  value={item.key}
                  onChange={(e) => {
                    const value = e.target.value;
                    setParams((prev) => prev.map((row, i) => (i === idx ? { ...row, key: value } : row)));
                  }}
                  placeholder="chave"
                  className="w-1/2 rounded border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-xs text-white"
                />
                <input
                  value={item.value}
                  onChange={(e) => {
                    const value = e.target.value;
                    setParams((prev) => prev.map((row, i) => (i === idx ? { ...row, value } : row)));
                  }}
                  placeholder="valor"
                  className="w-1/2 rounded border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={() => setParams((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-[var(--red)]"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="rounded-md border border-white/10 bg-[#0a0e14] p-3 font-mono text-xs text-slate-300">{jdbcPreview}</div>

          <ConnectionTester
            connectionData={{
              name: name.trim(),
              host: host.trim(),
              port,
              username: username.trim(),
              password,
              databaseName: databaseName.trim() || null,
              jdbcParams: jdbcParamsObject
            }}
          />

          {validationError && <p className="text-xs text-[var(--red)]">{validationError}</p>}
        </div>

        <div className="absolute bottom-0 left-0 right-0 flex gap-2 border-t border-white/10 bg-[#0f1520] p-4">
          <button className="flex-1 rounded-md border border-white/15 px-3 py-2 text-sm" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="flex-1 rounded-md border border-[var(--teal)]/50 bg-[var(--teal)]/20 px-3 py-2 text-sm text-[var(--teal)] disabled:opacity-60"
            onClick={handleSave}
            disabled={Boolean(validationError) || saving}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-xs text-slate-300">
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--teal)]"
      />
    </label>
  );
}
