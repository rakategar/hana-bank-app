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
        'card text-left w-full hover:border-hana-teal-500 transition-colors',
        compact && 'p-3'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-elevated grid place-items-center font-display font-bold text-white text-sm shrink-0">
          {initials(user.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{user.name}</p>
          <p className="text-[11px] text-text-muted truncate">{user.role} · {user.branch}</p>
        </div>
        {avg != null ? <ScoreBadge score={Math.round(avg)} showScore /> : <ScoreBadge />}
        {onClick && <ChevronRight size={18} className="text-text-muted shrink-0" />}
      </div>
      {!compact && (
        <div className="flex items-center justify-between mt-3">
          <StatusPill status={inputStatus} />
          <span className="text-xs text-text-secondary">{filled}/{totalSlots} slot selesai</span>
        </div>
      )}
    </button>
  );
}
