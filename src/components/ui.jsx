import { Loader2, X } from 'lucide-react';
import { clsx } from '../lib/utils';

export function Spinner({ className = '', size = 20 }) {
  return <Loader2 size={size} className={clsx('animate-spin text-hana-teal-500', className)} />;
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
    <div className="rounded-lg border border-score-1/40 bg-score-1/10 px-4 py-3 text-sm text-score-1">
      {children}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, maxWidth = 'max-w-lg' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className={clsx(
          'relative w-full bg-elevated border border-hana-border rounded-t-2xl sm:rounded-2xl',
          'shadow-2xl animate-slide-down max-h-[90vh] overflow-y-auto',
          maxWidth
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-hana-border sticky top-0 bg-elevated">
          <h3 className="font-display text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-white" aria-label="Tutup">
            <X size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-hana-border sticky bottom-0 bg-elevated">{footer}</div>}
      </div>
    </div>
  );
}

export function StatusPill({ status }) {
  const map = {
    scored: { label: 'Sudah Dinilai ✓', cls: 'bg-score-4/15 text-score-4' },
    draft: { label: 'Draft Tersimpan', cls: 'bg-score-2/15 text-score-2' },
    belum: { label: 'Belum Diisi', cls: 'bg-text-muted/15 text-text-secondary' },
  };
  const s = map[status] || map.belum;
  return <span className={clsx('px-3 py-1 rounded-full text-[11px] font-semibold', s.cls)}>{s.label}</span>;
}
