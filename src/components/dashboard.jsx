import { useNavigate } from 'react-router-dom';
import { ClipboardList, PencilLine, CheckCircle2, AlertCircle, MessageSquareText, ListChecks } from 'lucide-react';
import { StatusPill } from './ui';
import { clsx } from '../lib/utils';

// Kartu status hari ini — TANPA membocorkan skor (skor hanya untuk atasan)
export function TodayStatusCard({ activity, score, totalSlots }) {
  const filled = activity?.activities?.filter((a) => a.actual && a.actual.trim()).length || 0;
  let dailyStatus = 'belum';
  if (score) dailyStatus = 'scored';
  else if (activity) dailyStatus = 'draft';
  const pct = totalSlots ? Math.round((filled / totalSlots) * 100) : 0;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListChecks size={18} className="text-hana-teal-600" />
          <p className="font-semibold text-sm">Input Aktivitas Hari Ini</p>
        </div>
        <StatusPill status={dailyStatus} />
      </div>
      <div className="flex items-end gap-2">
        <span className="font-display font-extrabold text-4xl leading-none text-ink">{filled}</span>
        <span className="text-text-muted text-sm mb-1">/ {totalSlots} slot terisi</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-elevated overflow-hidden">
        <div className="h-full rounded-full bg-hana-teal-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      {dailyStatus === 'scored' && (
        <p className="text-[11px] text-text-muted mt-2">
          Sudah dinilai AI — hasil penilaian hanya dapat dilihat oleh atasan Anda.
        </p>
      )}
    </div>
  );
}

// Status weekly plan + daily input (ringkas)
export function PlanDailyStatus({ plan, activity, score }) {
  const planSubmitted = plan && plan.submitted_at;
  let dailyStatus = 'belum';
  if (score) dailyStatus = 'scored';
  else if (activity) dailyStatus = 'draft';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="card">
        <p className="text-xs text-text-muted mb-2">Rencana Minggu Ini</p>
        {planSubmitted ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-score-4">
            <CheckCircle2 size={16} /> Sudah disubmit
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-score-2">
            <AlertCircle size={16} /> Belum ada rencana
          </span>
        )}
      </div>
      <div className="card">
        <p className="text-xs text-text-muted mb-2">Status Penilaian</p>
        <StatusPill status={dailyStatus} />
      </div>
    </div>
  );
}

export function PrimaryActions({ role }) {
  const navigate = useNavigate();
  const showWeeklyPlan = role === 'FA';
  return (
    <div className={showWeeklyPlan ? 'grid sm:grid-cols-2 gap-4' : ''}>
      {showWeeklyPlan && (
        <button onClick={() => navigate('/weekly-plan')} className="btn-teal w-full">
          <ClipboardList size={18} /> Buat Rencana Minggu Ini
        </button>
      )}
      <button onClick={() => navigate('/daily-input')} className="btn-pink w-full">
        <PencilLine size={18} /> Input Aktivitas Hari Ini
      </button>
    </div>
  );
}

export function NotesCard({ notes = [], fromLabel = 'Supervisor' }) {
  if (!notes.length) return null;
  return (
    <div className="space-y-3">
      {notes.map((n) => (
        <div key={n.id} className="card border-hana-teal-500/30 bg-hana-teal-50">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquareText size={16} className="text-hana-teal-600" />
            <p className="text-sm font-semibold text-hana-teal-700">Catatan dari {fromLabel}</p>
          </div>
          <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">{n.supervisor_notes}</p>
          {Array.isArray(n.action_plans) && n.action_plans.length > 0 && (
            <div className="mt-3 pt-3 border-t border-hana-border">
              <p className="text-xs text-text-muted mb-1.5">Action Plan:</p>
              <ul className="space-y-1">
                {n.action_plans.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 text-xs text-text-secondary">
                    <span className={clsx('h-3.5 w-3.5 rounded border grid place-items-center', a.is_completed ? 'bg-score-4 border-score-4' : 'border-hana-border')}>
                      {a.is_completed && <CheckCircle2 size={10} className="text-white" />}
                    </span>
                    {a.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function SectionTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between mb-3 mt-1">
      <h2 className="font-display text-lg font-bold">{children}</h2>
      {action}
    </div>
  );
}
