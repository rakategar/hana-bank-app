import { ChevronRight } from 'lucide-react';
import ScoreBadge from './ScoreBadge';
import { StatusPill } from './ui';
import { initials, clsx } from '../lib/utils';

// snapshot: { user, score, totalSlots, filled, inputStatus }
export default function MonitorCard({ snapshot, onClick, compact = false }) {
  const { user, score, totalSlots, filled, inputStatus } = snapshot;
  const avg = score?.daily_average;

  return (
    <button
      onClick={onClick}
      className={clsx(
        'card w-full text-left transition-all hover:border-hana-teal-300 hover:bg-white/95 hover:shadow-raised focus:outline-none focus-visible:shadow-focus',
        compact && 'p-3'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-hana-teal-50 font-display text-sm font-bold text-hana-teal-700">
          {initials(user.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{user.name}</p>
          <p className="truncate text-[11px] text-text-muted">{user.role} - {user.branch}</p>
        </div>
        {avg != null ? <ScoreBadge score={Math.round(avg)} showScore /> : <ScoreBadge />}
        {onClick && <ChevronRight size={18} className="text-text-muted shrink-0" />}
      </div>
      {!compact && (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-hana-border/70 pt-3">
          <StatusPill status={inputStatus} />
          <span className="text-xs text-text-secondary">{filled}/{totalSlots} slot selesai</span>
        </div>
      )}
    </button>
  );
}
