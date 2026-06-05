import { useEffect, useState } from 'react';
import { Modal, FullSpinner } from './ui';
import ScoreBadge from './ScoreBadge';
import { fetchDailyActivity, fetchScore } from '../lib/db';
import { todayISO, formatDateID } from '../lib/utils';

const STATUS_LABEL = { done: '✓ Done', partial: '⚡ Partial', not_done: '✗ Not Done' };

// Read-only detail aktivitas + skor seorang user (untuk supervisor)
export default function ActivityDetailModal({ user, date, open, onClose }) {
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState(null);
  const [score, setScore] = useState(null);

  useEffect(() => {
    if (!open || !user) return;
    const targetDate = date || todayISO();
    setLoading(true);
    (async () => {
      try {
        const [a, s] = await Promise.all([
          fetchDailyActivity(user.id, targetDate),
          fetchScore(user.id, targetDate),
        ]);
        setActivity(a);
        setScore(s);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, user, date]);

  const scoreByTime = new Map((score?.scores || []).map((s) => [s.time, s]));

  const formattedDate = date ? formatDateID(date) : 'Hari Ini';

  return (
    <Modal open={open} onClose={onClose} title={user ? `Aktivitas — ${user.name} (${formattedDate})` : ''} maxWidth="max-w-xl">
      {loading ? (
        <FullSpinner />
      ) : !activity?.activities?.length ? (
        <p className="text-sm text-text-secondary text-center py-6">Belum ada aktivitas pada tanggal ini.</p>
      ) : (
        <div className="space-y-3">
          {score?.daily_average != null && (
            <div className="flex items-center justify-between card !p-3">
              <span className="text-sm text-text-secondary">Skor Hari Ini</span>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-xl">{Number(score.daily_average).toFixed(1)}</span>
                <ScoreBadge level={score.daily_level} />
              </div>
            </div>
          )}
          {activity.activities.map((a) => {
            const s = scoreByTime.get(a.time);
            return (
              <div key={a.time} className="border-b border-hana-border pb-3 last:border-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    <span className="text-hana-teal-700 font-display">{a.time}</span> {a.label}
                  </p>
                  {s && <ScoreBadge score={s.score} showScore />}
                </div>
                <p className="text-xs text-text-secondary mt-1">{a.actual || <span className="text-text-muted italic">— kosong —</span>}</p>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-text-muted">
                  <span>{STATUS_LABEL[a.activity_status] || a.activity_status}</span>
                  {a.notes && <span>· {a.notes}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
