import { useState } from 'react';
import { CheckCircle2, Loader2, PlayCircle, XCircle } from 'lucide-react';
import { apiService } from '../services/api';
import { ConnectionPayload } from '../types/connection';

export type ConnectionTestResult = {
  success: boolean;
  message: string;
  latencyMs: number;
};

type Props = {
  connectionId?: string;
  connectionData?: ConnectionPayload;
  onResult?: (result: ConnectionTestResult) => void;
  buttonLabel?: string;
};

export function ConnectionTester({ connectionId, connectionData, onResult, buttonLabel = 'Testar Conexão' }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConnectionTestResult | null>(null);

  async function handleTest() {
    setLoading(true);
    setResult(null);

    try {
      let testResult: ConnectionTestResult;

      if (connectionId) {
        testResult = await apiService.testConnection(connectionId);
      } else if (connectionData) {
        const temp = await apiService.createConnection(connectionData);
        try {
          testResult = await apiService.testConnection(temp.id);
        } finally {
          await apiService.deleteConnection(temp.id);
        }
      } else {
        throw new Error('Dados insuficientes para teste');
      }

      setResult(testResult);
      onResult?.(testResult);
    } catch (error) {
      const failed = {
        success: false,
        message: error instanceof Error ? error.message : 'Falha no teste de conexão',
        latencyMs: 0
      };
      setResult(failed);
      onResult?.(failed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleTest}
        disabled={loading}
        className="flex items-center gap-2 rounded-md border border-[var(--teal)]/40 bg-[var(--teal)]/10 px-3 py-2 text-sm text-[var(--teal)] disabled:opacity-60"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
        {loading ? 'Testando...' : buttonLabel}
      </button>

      {loading && (
        <div className="rounded-md bg-white/5 px-3 py-2 text-xs text-slate-300">
          Testando conexão<span className="animate-pulse">...</span>
        </div>
      )}

      {result && (
        <div
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs ${
            result.success
              ? 'border border-[var(--green)]/30 bg-[var(--green)]/10 text-[var(--green)]'
              : 'border border-[var(--red)]/30 bg-[var(--red)]/10 text-[var(--red)]'
          }`}
        >
          {result.success ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
          <span>
            {result.message}
            {result.success && ` (latência: ${result.latencyMs}ms)`}
          </span>
        </div>
      )}
    </div>
  );
}
