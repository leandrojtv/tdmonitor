import { AlertTriangle, RefreshCcw } from 'lucide-react';

type Props = {
  title: string;
  description: string;
  onRetry?: () => void;
};

export function ApiErrorState({ title, description, onRetry }: Props) {
  return (
    <div className="rounded-xl border border-[var(--red)]/30 bg-[var(--red)]/10 p-6 text-center">
      <AlertTriangle className="mx-auto mb-2 text-[var(--red)]" size={22} />
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-1 text-sm text-slate-300">{description}</p>
      {onRetry && (
        <button className="btn-editor mt-3" onClick={onRetry}><RefreshCcw size={14} /> Tentar novamente</button>
      )}
    </div>
  );
}

export function EmptyState({ title, description, ctaLabel, onCta }: { title: string; description: string; ctaLabel?: string; onCta?: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-white/20 p-10 text-center">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
      {ctaLabel && onCta && <button className="btn-editor mt-4" onClick={onCta}>{ctaLabel}</button>}
    </div>
  );
}
