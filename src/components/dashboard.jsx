import { useNavigate } from 'react-router-dom';
import { ClipboardList, PencilLine, CheckCircle2, AlertCircle, MessageSquareText } from 'lucide-react';
import ScoreBadge from './ScoreBadge';
import { StatusPill } from './ui';
import { levelInfo, formatDateID, clsx } from '../lib/utils';

// Kartu skor hari ini (angka besar + level)
export function ScoreCard({ score, date }) {
  const has = score && score.daily_average != null;
  const info = has ? levelInfo(Math.round(score.daily_average)) : null;
  return (
    <div className="card relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-text-muted">{formatDateID(date)}</p>
          <p className="text-sm text-text-secondary mt-0.5">Skor Hari Ini</p>
        </div>
        {has ? <ScoreBadge score={Math.round(score.daily_average)} size="lg" /> : <StatusPill status="belum" />}
      </div>
      <div className="flex items-end gap-3 mt-3">
        <span
          className="font-display font-extrabold leading-none text-6xl"
          style={{ color: info ? info.color : '#52616B' }}
        >
          {has ? Number(score.daily_average).toFixed(1) : '—'}
        </span>
        <span className="text-text-muted text-sm mb-2">/ 4.0</span>
      </div>
      {has && score.summary && (
        <p className="text-xs text-text-secondary mt-3 leading-relaxed">{score.summary}</p>
      )}
    </div>
  );
}

// Status weekly plan + daily input
export function PlanDailyStatus({ plan, activity, score }) {
  const planSubmitted = plan && plan.submitted_at;
  let dailyStatus = 'belum';
  if (score) dailyStatus = 'scored';
  else if (activity) dailyStatus = 'draft';

  return (
    <div className="grid grid-cols-2 gap-3">
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
        <p className="text-xs text-text-muted mb-2">Input Harian</p>
        <StatusPill status={dailyStatus} />
      </div>
    </div>
  );
}

// 2 tombol utama
export function PrimaryActions() {
  const navigate = useNavigate();
  return (
    <div className="grid gap-3">
      <button onClick={() => navigate('/weekly-plan')} className="btn-teal w-full">
        <ClipboardList size={18} /> Buat Rencana Minggu Ini
      </button>
      <button onClick={() => navigate('/daily-input')} className="btn-pink w-full">
        <PencilLine size={18} /> Input Aktivitas Hari Ini
      </button>
    </div>
  );
}

// Notes read-only dari supervisor
export function NotesCard({ notes = [], fromLabel = 'Supervisor' }) {
  if (!notes.length) return null;
  return (
    <div className="space-y-3">
      {notes.map((n) => (
        <div key={n.id} className="card border-hana-teal-500/30 bg-hana-teal-500/5">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquareText size={16} className="text-hana-teal-500" />
            <p className="text-sm font-semibold text-hana-teal-500">Catatan dari {fromLabel}</p>
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
    <div className="flex items-center justify-between mb-2 mt-1">
      <h2 className="font-display text-lg font-bold">{children}</h2>
      {action}
    </div>
  );
}
