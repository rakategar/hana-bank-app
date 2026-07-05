import { useEffect, useMemo, useState } from 'react';
import { FolderClock, CalendarClock, CheckCircle2, StickyNote } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/Layout';
import { FullSpinner, ErrorBox } from '../../components/ui';
import { fetchSummariesBySupervisor, fetchAllUsers } from '../../lib/db';
import { formatDateID } from '../../lib/utils';

export default function BMNotesArchive() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [namesById, setNamesById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [summaries, allUsers] = await Promise.all([
          fetchSummariesBySupervisor(user.id),
          fetchAllUsers(),
        ]);
        setRows(summaries);
        setNamesById(Object.fromEntries(allUsers.map((u) => [u.id, u.name])));
      } catch (e) {
        setError(e.message || 'Gagal memuat arsip.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user.id]);

  const grouped = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      if (!map.has(r.date)) map.set(r.date, []);
      map.get(r.date).push(r);
    });
    return [...map.entries()];
  }, [rows]);

  return (
    <Layout title="Arsip Catatan" back="/summary/bm">
      {loading ? (
        <FullSpinner label="Memuat arsip catatan..." />
      ) : (
        <div className="space-y-5">
          {error && <ErrorBox>{error}</ErrorBox>}

          {grouped.length === 0 ? (
            <div className="card text-center py-12">
              <FolderClock size={36} className="text-text-muted mx-auto mb-3" />
              <p className="font-semibold">Belum ada catatan tersimpan</p>
              <p className="text-sm text-text-secondary mt-1">
                Catatan & action plan yang Anda simpan di Summary Tim akan terkumpul di sini.
              </p>
            </div>
          ) : (
            grouped.map(([date, items]) => (
              <div key={date} className="space-y-3">
                <p className="text-sm font-semibold text-hana-teal-700">{formatDateID(date)}</p>
                {items.map((r) => (
                  <div key={r.id} className="card">
                    <p className="font-display text-base font-bold mb-2">{namesById[r.target_user_id] || r.target_user_id}</p>

                    {r.supervisor_notes && r.supervisor_notes.trim() && (
                      <div className="mb-3">
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary mb-1">
                          <StickyNote size={13} /> Notes
                        </p>
                        <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{r.supervisor_notes}</p>
                      </div>
                    )}

                    {Array.isArray(r.action_plans) && r.action_plans.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-text-secondary mb-1.5">Action Plan</p>
                        <ul className="space-y-1.5">
                          {r.action_plans.map((a) => (
                            <li key={a.id} className="flex items-start gap-2 text-sm">
                              <span className="text-hana-teal-700 mt-0.5">•</span>
                              <span className="flex-1 text-ink">{a.label}</span>
                              {a.schedule?.date && (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${a.schedule.extra_plan_id ? 'bg-score-4/15 text-score-4' : 'bg-hana-teal-500/15 text-hana-teal-700'}`}>
                                  {a.schedule.extra_plan_id ? <CheckCircle2 size={11} /> : <CalendarClock size={11} />}
                                  {a.schedule.date} · {a.schedule.time}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </Layout>
  );
}
