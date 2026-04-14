import { Loader2 } from 'lucide-react';

type Props = {
  open: boolean;
  title: string;
  message: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmModal({ open, title, message, loading, onCancel, onConfirm }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#0f1520] p-5">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm text-slate-300">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="rounded border border-white/20 px-3 py-2 text-sm" onClick={onCancel} disabled={loading}>Cancelar</button>
          <button className="rounded border border-[var(--red)]/40 bg-[var(--red)]/20 px-3 py-2 text-sm text-[var(--red)]" onClick={onConfirm} disabled={loading}>
            {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="animate-spin" size={14} /> Excluindo...</span> : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
