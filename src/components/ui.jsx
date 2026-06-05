import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X, CheckCircle2, AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { clsx, initials, todayISO, formatDateID } from '../lib/utils';

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
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-ink/45" onClick={onClose} />
      <div
        className={clsx(
          'relative max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border border-hana-border bg-white shadow-xl sm:rounded-2xl',
          'animate-slide-down',
          maxWidth
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-hana-border bg-white px-5 py-4">
          <h3 className="font-display text-xl font-bold leading-none">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-2 text-text-muted hover:bg-elevated hover:text-ink" aria-label="Tutup">
            <X size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="sticky bottom-0 border-t border-hana-border bg-white/80 px-5 py-4 backdrop-blur-xl">{footer}</div>}
      </div>
    </div>,
    document.body
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

export function Select({ value, onChange, options, className = '', placeholder = 'Pilih opsi' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={containerRef} className={clsx('relative inline-block text-left', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-2.5 rounded-xl border border-hana-border bg-white/90 px-3.5 py-2 text-xs font-semibold text-text-secondary shadow-sm backdrop-blur transition-all hover:bg-white hover:text-ink focus:outline-none"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown
          size={14}
          className={clsx('text-text-muted transition-transform duration-200 shrink-0', isOpen && 'rotate-180 text-ink')}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-30 mt-1.5 max-h-60 w-full min-w-[160px] overflow-y-auto rounded-xl border border-white/80 bg-white/95 p-1 shadow-elevated backdrop-blur-xl animate-slide-down">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={clsx(
                  'flex w-full items-center rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors',
                  isSelected
                    ? 'bg-hana-teal-50 text-hana-teal-700 font-bold'
                    : 'text-text-secondary hover:bg-elevated hover:text-ink'
                )}
              >
                <span className="truncate">{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Pagination({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) {
  // Sesuai instruksi, pagination tetap dirender meskipun totalPages <= 1.
  // Tapi kita sesuaikan totalPages agar minimal 1.
  const resolvedTotalPages = Math.max(1, totalPages);
  const resolvedCurrentPage = Math.max(1, Math.min(currentPage, resolvedTotalPages));

  const getPages = () => {
    const pages = [];
    const maxVisible = 5;

    if (resolvedTotalPages <= maxVisible) {
      for (let i = 1; i <= resolvedTotalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      let start = Math.max(2, resolvedCurrentPage - 1);
      let end = Math.min(resolvedTotalPages - 1, resolvedCurrentPage + 1);

      if (resolvedCurrentPage <= 3) {
        end = 4;
      } else if (resolvedCurrentPage >= resolvedTotalPages - 2) {
        start = resolvedTotalPages - 3;
      }

      if (start > 2) {
        pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < resolvedTotalPages - 1) {
        pages.push('...');
      }

      pages.push(resolvedTotalPages);
    }
    return pages;
  };

  const pages = getPages();

  const startItem = totalItems !== undefined && itemsPerPage !== undefined && totalItems > 0
    ? (resolvedCurrentPage - 1) * itemsPerPage + 1
    : 0;
  const endItem = totalItems !== undefined && itemsPerPage !== undefined && totalItems > 0
    ? Math.min(resolvedCurrentPage * itemsPerPage, totalItems)
    : 0;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-t border-hana-border bg-white/50 backdrop-blur-sm rounded-b-2xl">
      {totalItems !== undefined ? (
        <p className="text-xs text-text-muted">
          Menampilkan <span className="font-semibold text-text-secondary">{startItem}</span> - <span className="font-semibold text-text-secondary">{endItem}</span> dari <span className="font-semibold text-text-secondary">{totalItems}</span> data
        </p>
      ) : (
        <div className="hidden sm:block" />
      )}

      <div className="flex items-center gap-1 self-center sm:self-auto">
        <button
          onClick={() => resolvedCurrentPage > 1 && onPageChange(resolvedCurrentPage - 1)}
          disabled={resolvedCurrentPage <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-hana-border bg-white text-text-secondary transition-all hover:bg-elevated hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Halaman Sebelumnya"
        >
          <ChevronLeft size={14} strokeWidth={2.5} />
        </button>

        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`ell-${idx}`} className="flex h-8 w-8 items-center justify-center text-xs text-text-muted select-none">
                &bull;&bull;&bull;
              </span>
            );
          }
          const active = p === resolvedCurrentPage;
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              disabled={resolvedTotalPages <= 1}
              className={clsx(
                'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-all',
                active
                  ? 'bg-hana-teal-600 text-white shadow-sm'
                  : 'bg-white border border-hana-border text-text-secondary hover:bg-elevated hover:text-ink disabled:opacity-50'
              )}
            >
              {p}
            </button>
          );
        })}

        <button
          onClick={() => resolvedCurrentPage < resolvedTotalPages && onPageChange(resolvedCurrentPage + 1)}
          disabled={resolvedCurrentPage >= resolvedTotalPages}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-hana-border bg-white text-text-secondary transition-all hover:bg-elevated hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Halaman Selanjutnya"
        >
          <ChevronRight size={14} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

export function DashboardSkeleton({ stats = 4, rows = 5, showTabs = true }) {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-48 skeleton" />
          <div className="h-4 w-64 skeleton" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-36 skeleton rounded-xl animate-pulse" />
          <div className="h-10 w-36 skeleton rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: stats }).map((_, i) => (
          <div key={i} className="card flex flex-col gap-2.5 p-5">
            <div className="flex justify-between items-start">
              <div className="h-4 w-20 skeleton" />
              <div className="h-7 w-7 rounded-lg skeleton shrink-0" />
            </div>
            <div className="h-8 w-16 skeleton" />
            <div className="h-3 w-28 skeleton mt-0.5" />
          </div>
        ))}
      </div>

      {/* Tabs Skeleton */}
      {showTabs && (
        <div className="relative mb-5 grid grid-cols-2 border-b border-hana-border">
          <span className="absolute bottom-[-1px] left-0 h-0.5 w-1/2 bg-hana-teal-600" />
          <div className="relative z-10 flex items-center justify-center px-3 pb-3 pt-1">
            <div className="h-4 w-20 skeleton" />
          </div>
          <div className="relative z-10 flex items-center justify-center px-3 pb-3 pt-1">
            <div className="h-4 w-32 skeleton" />
          </div>
        </div>
      )}

      {/* Content Table Skeleton */}
      <div className="card !p-0 overflow-hidden">
        {/* Table Header Bar */}
        <div className="border-b border-hana-border px-4 py-4 sm:px-6 flex justify-between items-center">
          <div className="h-5 w-36 skeleton" />
          <div className="h-8 w-24 skeleton rounded-xl" />
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-hana-border/30 px-6">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="py-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl skeleton shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 skeleton" />
                  <div className="h-3 w-24 skeleton" />
                </div>
              </div>
              <div className="hidden md:flex flex-1 justify-around gap-4 px-8">
                <div className="h-4 w-20 skeleton" />
                <div className="h-4 w-28 skeleton" />
                <div className="h-4 w-16 skeleton" />
              </div>
              <div className="h-7 w-16 rounded-lg skeleton shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Avatar({ name }) {
  const initial = initials(name);
  const charCode = name.charCodeAt(0) || 0;
  const gradients = [
    'from-teal-500/20 to-emerald-500/20 text-hana-teal-700 border-hana-teal-200/50',
    'from-blue-500/20 to-indigo-500/20 text-indigo-700 border-indigo-200/50',
    'from-purple-500/20 to-pink-500/20 text-purple-700 border-purple-200/50',
    'from-orange-500/20 to-amber-500/20 text-orange-700 border-orange-200/50',
  ];
  const gradient = gradients[charCode % gradients.length];
  return (
    <div className={clsx('flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-gradient-to-br font-display text-xs font-bold uppercase tracking-wider shadow-inner', gradient)}>
      {initial}
    </div>
  );
}

export function SummarySkeleton({ usersCount = 6, showGenerated = false }) {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Date Picker Card Skeleton */}
      <div className="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl skeleton shrink-0" />
          <div className="space-y-1.5">
            <div className="h-3 w-20 skeleton" />
            <div className="h-4 w-32 skeleton" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-20 skeleton" />
          <div className="h-8 w-36 skeleton rounded-xl animate-pulse" />
        </div>
      </div>

      {/* User PDF list Skeleton */}
      <div className="card">
        <div className="border-b border-hana-border pb-3 mb-4 space-y-1.5">
          <div className="h-5 w-48 skeleton" />
          <div className="h-3 w-80 skeleton" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: usersCount }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-hana-border bg-white p-3">
              <div className="h-9 w-9 rounded-full skeleton shrink-0 animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-24 skeleton" />
                <div className="h-3 w-16 skeleton" />
              </div>
              <div className="h-8 w-14 rounded-lg skeleton shrink-0 animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Optional generated summary skeleton (when generating is true) */}
      {showGenerated && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <div className="h-8 w-36 skeleton rounded-xl" />
            <div className="h-8 w-24 skeleton rounded-xl" />
          </div>

          {/* AI Executive Summary Box */}
          <div className="card flex flex-col gap-3">
            <div className="flex justify-between items-center pb-2 border-b border-hana-border">
              <div className="h-5 w-36 skeleton" />
              <div className="h-5 w-24 skeleton rounded-full" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full skeleton" />
              <div className="h-4 w-full skeleton" />
              <div className="h-4 w-3/4 skeleton" />
            </div>
          </div>

          {/* Ranking Box */}
          <div className="card">
            <div className="h-5 w-40 skeleton mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <div className="h-6 w-6 rounded-full skeleton shrink-0" />
                  <div className="h-9 w-9 rounded-full skeleton shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-32 skeleton" />
                    <div className="h-3 w-16 skeleton" />
                  </div>
                  <div className="h-8 w-16 rounded skeleton shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Reusable date picker card with gradient background, quick buttons, and calendar modal.
 * @param {{ date: string, onChange: (d: string) => void, label?: string }} props
 */
export function DatePickerCard({ date, onChange, label = 'Tanggal Laporan' }) {
  const [open, setOpen] = useState(false);

  const yesterdayISO = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  };

  // Parse date string to Date object
  const selectedDate = date ? new Date(date + 'T00:00:00') : new Date();

  const handleDateChange = (d) => {
    if (d) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      onChange(`${y}-${m}-${day}`);
    }
    setOpen(false);
  };

  // Simple calendar renderer
  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const [viewDate, setViewDate] = useState(selectedDate);

  // Sync viewDate when modal is opened
  useEffect(() => {
    if (open) {
      setViewDate(selectedDate);
    }
  }, [open, date]);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const totalDays = daysInMonth(viewYear, viewMonth);
  const startDay = firstDayOfMonth(viewYear, viewMonth);

  const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const prevMonth = () => setViewDate(new Date(viewYear, viewMonth - 1, 1));
  const nextMonth = () => setViewDate(new Date(viewYear, viewMonth + 1, 1));

  const isToday = (day) => {
    const now = new Date();
    return day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();
  };
  const isSelected = (day) => {
    return day === selectedDate.getDate() && viewMonth === selectedDate.getMonth() && viewYear === selectedDate.getFullYear();
  };

  return (
    <div className="relative rounded-2xl border border-white/80 bg-white/80 shadow-card backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[linear-gradient(135deg,rgba(4,178,146,0.06),transparent_50%)]" />
      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-hana-teal-500 to-hana-teal-600 text-white shadow-md">
            <Calendar size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted">{label}</p>
            <p className="font-display text-lg font-extrabold text-ink leading-tight">{formatDateID(date)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChange(yesterdayISO())}
            className={clsx(
              'rounded-xl border px-3 py-2 text-[11px] font-bold transition-colors',
              date === yesterdayISO()
                ? 'border-hana-teal-200 bg-hana-teal-50 text-hana-teal-700'
                : 'border-hana-border bg-white text-text-secondary hover:bg-elevated hover:text-ink'
            )}
          >
            Kemarin
          </button>
          <button
            onClick={() => onChange(todayISO())}
            className={clsx(
              'rounded-xl border px-3 py-2 text-[11px] font-bold transition-colors',
              date === todayISO()
                ? 'border-hana-teal-200 bg-hana-teal-50 text-hana-teal-700'
                : 'border-hana-border bg-white text-text-secondary hover:bg-elevated hover:text-ink'
            )}
          >
            Hari ini
          </button>

          <button
            onClick={() => setOpen(true)}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-hana-border bg-white px-3 text-xs font-semibold text-text-secondary transition-colors hover:border-hana-teal-300 hover:text-ink"
          >
            <Calendar size={14} />
            <span>Pilih Tanggal</span>
          </button>

          <Modal
            open={open}
            onClose={() => setOpen(false)}
            title="Pilih Tanggal"
            maxWidth="max-w-sm"
          >
            <div className="p-1">
              {/* Month/Year Header */}
              <div className="mb-4 flex items-center justify-between">
                <button
                  onClick={prevMonth}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-hana-border bg-white text-text-secondary hover:bg-elevated hover:text-ink transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <p className="font-display text-base font-extrabold text-ink">
                  {MONTHS[viewMonth]} {viewYear}
                </p>
                <button
                  onClick={nextMonth}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-hana-border bg-white text-text-secondary hover:bg-elevated hover:text-ink transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Day Labels */}
              <div className="mb-2 grid grid-cols-7 gap-1 text-center">
                {DAYS.map((d) => (
                  <span key={d} className="py-1 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                    {d}
                  </span>
                ))}
              </div>

              {/* Day Grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startDay }).map((_, i) => (
                  <span key={`e-${i}`} />
                ))}
                {Array.from({ length: totalDays }).map((_, i) => {
                  const day = i + 1;
                  const sel = isSelected(day);
                  const today = isToday(day);
                  return (
                    <button
                      key={day}
                      onClick={() => handleDateChange(new Date(viewYear, viewMonth, day))}
                      className={clsx(
                        'grid h-9 w-full place-items-center rounded-xl text-xs font-semibold transition-all duration-150',
                        sel
                          ? 'bg-gradient-to-br from-hana-teal-500 to-hana-teal-600 text-white shadow-md scale-105'
                          : today
                            ? 'bg-hana-teal-50 text-hana-teal-700 font-bold ring-1 ring-hana-teal-200'
                            : 'text-text-secondary hover:bg-elevated hover:text-ink'
                      )}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="mt-4 flex items-center justify-between border-t border-hana-border/30 pt-4">
                <button
                  onClick={() => {
                    onChange(todayISO());
                    setOpen(false);
                    setViewDate(new Date());
                  }}
                  className="text-[11px] font-bold text-hana-teal-600 hover:text-hana-teal-800 transition-colors"
                >
                  Kembali ke Hari Ini
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-xl bg-elevated px-4 py-2 text-[11px] font-bold text-text-secondary hover:text-ink transition-colors"
                >
                  Batal
                </button>
              </div>
            </div>
          </Modal>
        </div>
      </div>
    </div>
  );
}
