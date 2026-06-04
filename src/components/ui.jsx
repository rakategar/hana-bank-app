import { useEffect } from 'react';
import { Loader2, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { clsx } from '../lib/utils';

export function Spinner({ className = '', size = 20 }) {
  return <Loader2 size={size} className={clsx('animate-spin text-hana-teal-600', className)} />;
}

export function FullSpinner({ label }) {
  return (
    <div className="grid place-items-center gap-4 py-16">
      <div className="grid h-12 w-12 place-items-center rounded-2xl border border-hana-teal-100 bg-white/75 shadow-card backdrop-blur">
        <Spinner size={26} />
      </div>
      {label && <p className="text-sm font-medium text-text-secondary">{label}</p>}
    </div>
  );
}

export function ErrorBox({ children }) {
  if (!children) return null;
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-score-1/20 bg-score-1/10 px-4 py-3 text-sm text-score-1">
      <AlertTriangle size={17} className="mt-0.5 shrink-0" />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, maxWidth = 'max-w-lg' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-ink/45 backdrop-blur-sm" onClick={onClose} />
      <div
        className={clsx(
          'relative max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border border-white/70 bg-white/90 shadow-elevated backdrop-blur-xl sm:rounded-2xl',
          'animate-slide-down',
          maxWidth
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-hana-border bg-white/80 px-5 py-4 backdrop-blur-xl">
          <h3 className="font-display text-xl font-bold leading-none">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-2 text-text-muted hover:bg-elevated hover:text-ink" aria-label="Tutup">
            <X size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="sticky bottom-0 border-t border-hana-border bg-white/80 px-5 py-4 backdrop-blur-xl">{footer}</div>}
      </div>
    </div>
  );
}

export function Toast({ toast, onClose, duration = 3000 }) {
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [toast, onClose, duration]);

  if (!toast) return null;
  const isError = toast.type === 'error';
  const Icon = isError ? AlertTriangle : CheckCircle2;
  return (
    <div className="fixed right-4 top-4 z-[60] animate-slide-down">
      <div
        className={clsx(
          'flex max-w-sm items-start gap-2.5 rounded-2xl border bg-white/90 px-4 py-3 shadow-elevated backdrop-blur-xl',
          isError ? 'border-score-1/25 text-score-1' : 'border-score-4/25 text-score-4'
        )}
      >
        <Icon size={18} className="mt-0.5 shrink-0" />
        <p className="text-sm font-semibold leading-relaxed">{toast.message}</p>
        <button onClick={onClose} className="ml-1 text-current/70 hover:text-current" aria-label="Tutup">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export function StatusPill({ status }) {
  const map = {
    scored: { label: 'Sudah Dinilai', cls: 'border-score-4/25 bg-score-4/10 text-score-4' },
    draft: { label: 'Draft Tersimpan', cls: 'border-score-2/25 bg-score-2/10 text-score-2' },
    belum: { label: 'Belum Diisi', cls: 'border-hana-border bg-elevated text-text-secondary' },
  };
  const s = map[status] || map.belum;
  return <span className={clsx('badge', s.cls)}>{s.label}</span>;
}
