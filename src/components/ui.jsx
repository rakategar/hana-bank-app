import { useEffect } from 'react';
import { Loader2, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { clsx } from '../lib/utils';

export function Spinner({ className = '', size = 20 }) {
  return <Loader2 size={size} className={clsx('animate-spin text-hana-teal-700', className)} />;
}

export function FullSpinner({ label }) {
  return (
    <div className="grid place-items-center py-16 gap-3">
      <Spinner size={32} />
      {label && <p className="text-sm text-text-secondary">{label}</p>}
    </div>
  );
}

export function ErrorBox({ children }) {
  if (!children) return null;
  return (
    <div className="rounded-lg border border-score-1/40 bg-score-1/10 px-4 py-3 text-sm text-score-1 whitespace-pre-wrap">
      {children}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, maxWidth = 'max-w-lg' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={clsx(
          'relative w-full bg-white border border-hana-border rounded-t-2xl sm:rounded-2xl',
          'shadow-elevated animate-slide-down max-h-[90vh] overflow-y-auto',
          maxWidth
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-hana-border sticky top-0 bg-white">
          <h3 className="font-display text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-ink" aria-label="Tutup">
            <X size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-hana-border sticky bottom-0 bg-white">{footer}</div>}
      </div>
    </div>
  );
}

// Notifikasi pojok kanan atas. toast = { type: 'success'|'error', message } | null.
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
    <div className="fixed top-4 right-4 z-[60] animate-slide-down">
      <div
        className={clsx(
          'flex items-start gap-2.5 rounded-lg border px-4 py-3 shadow-elevated max-w-sm',
          isError ? 'bg-score-1/10 border-score-1/40 text-score-1' : 'bg-score-4/10 border-score-4/40 text-score-4'
        )}
      >
        <Icon size={18} className="mt-0.5 shrink-0" />
        <p className="text-sm font-medium">{toast.message}</p>
        <button onClick={onClose} className="ml-1 text-current/70 hover:text-current" aria-label="Tutup">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export function StatusPill({ status }) {
  const map = {
    scored: { label: 'Sudah Dinilai ✓', cls: 'bg-score-4/15 text-score-4' },
    draft: { label: 'Draft Tersimpan', cls: 'bg-score-2/15 text-score-2' },
    belum: { label: 'Belum Diisi', cls: 'bg-elevated text-text-secondary' },
  };
  const s = map[status] || map.belum;
  return <span className={clsx('px-3 py-1 rounded-full text-[11px] font-semibold', s.cls)}>{s.label}</span>;
}
