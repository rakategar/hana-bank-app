import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, AlertTriangle, ArrowUp, ArrowDown, Minus, ScrollText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/Layout';
import TeamHeatmap from '../../components/TeamHeatmap';
import ScoreBadge from '../../components/ScoreBadge';
import ActivityDetailModal from '../../components/ActivityDetailModal';
import WarningModal from './WarningModal';
import { FullSpinner, ErrorBox, StatusPill } from '../../components/ui';
import { SectionTitle } from '../../components/dashboard';
import { fetchAllUsers, fetchUserDaySnapshot, fetchScoreRange, fetchWarningsFrom } from '../../lib/db';
import { lastNDates, formatDateID, clsx } from '../../lib/utils';

const ROLE_ORDER = { BM: 0, FWSS: 1, FA: 2 };

function Trend({ value }) {
  if (value > 0) return <span className="inline-flex items-center text-score-4 text-xs"><ArrowUp size={14} /></span>;
  if (value < 0) return <span className="inline-flex items-center text-score-1 text-xs"><ArrowDown size={14} /></span>;
  return <span className="inline-flex items-center text-text-muted text-xs"><Minus size={14} /></span>;
}

export default function RHDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [heatRows, setHeatRows] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [showWarning, setShowWarning] = useState(false);
  const [detailUser, setDetailUser] = useState(null);
  const [tab, setTab] = useState('monitor'); // monitor | log

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const all = await fetchAllUsers();
      const team = all.filter((u) => u.role !== 'RH');
      const dates = lastNDates(10);
      const yesterday = dates[dates.length - 2];
      const today = dates[dates.length - 1];

      const enriched = await Promise.all(
        team.map(async (u) => {
          const [snap, range] = await Promise.all([
            fetchUserDaySnapshot(u),
            fetchScoreRange(u.id, dates),
          ]);
          const byDate = new Map(range.map((r) => [r.date, r.daily_average]));
          const t = byDate.get(today);
          const y = byDate.get(yesterday);
          const trend = t != null && y != null ? t - y : 0;
          return { ...snap, scoresByDate: byDate, trend };
        })
      );

      enriched.sort((a, b) => {
        const sa = a.score?.daily_average ?? -1;
        const sb = b.score?.daily_average ?? -1;
        if (sb !== sa) return sb - sa;
        return (ROLE_ORDER[a.user.role] ?? 9) - (ROLE_ORDER[b.user.role] ?? 9);
      });

      setRows(enriched);
      setHeatRows(enriched.map((e) => ({ user: e.user, scoresByDate: e.scoresByDate })));

      const w = await fetchWarningsFrom(user.id);
      setWarnings(w);
    } catch (e) {
      setError(e.message || 'Gagal memuat data RH.');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  const candidateUsers = rows.map((r) => r.user);

  return (
    <Layout accent="rh">
      {loading ? (
        <FullSpinner label="Memuat overview regional..." />
      ) : (
        <div className="space-y-4">
          {error && <ErrorBox>{error}</ErrorBox>}

          <div>
            <p className="font-display text-2xl font-bold">Regional Head</p>
            <p className="text-sm text-text-muted">{user.name} · {user.branch}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => navigate('/summary/rh')} className="btn-teal">
              <Bot size={18} /> Generate Summary
            </button>
            <button onClick={() => setShowWarning(true)} className="btn-pink">
              <AlertTriangle size={18} /> Kirim Peringatan
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-hana-border">
            {[['monitor', 'Monitoring'], ['log', 'Log Surat Peringatan']].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={clsx(
                  'px-3 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors',
                  tab === k ? 'border-hana-teal-500 text-hana-teal-500' : 'border-transparent text-text-muted hover:text-white'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'monitor' ? (
            <>
              {/* Tabel semua user */}
              <div className="card !p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] text-text-muted border-b border-hana-border">
                      <th className="px-3 py-2 font-medium">Nama</th>
                      <th className="px-2 py-2 font-medium">Skor</th>
                      <th className="px-2 py-2 font-medium">Trend</th>
                      <th className="px-2 py-2 font-medium hidden sm:table-cell">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const avg = r.score?.daily_average;
                      return (
                        <tr
                          key={r.user.id}
                          onClick={() => setDetailUser(r.user)}
                          className="border-b border-hana-border/50 last:border-0 cursor-pointer hover:bg-elevated"
                        >
                          <td className="px-3 py-2.5">
                            <p className="font-semibold leading-tight">{r.user.name}</p>
                            <p className="text-[10px] text-text-muted">{r.user.role} · {r.user.branch}</p>
                          </td>
                          <td className="px-2 py-2.5">
                            {avg != null ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-display font-bold">{Number(avg).toFixed(1)}</span>
                                <ScoreBadge score={Math.round(avg)} />
                              </div>
                            ) : (
                              <ScoreBadge />
                            )}
                          </td>
                          <td className="px-2 py-2.5"><Trend value={r.trend} /></td>
                          <td className="px-2 py-2.5 hidden sm:table-cell"><StatusPill status={r.inputStatus} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Team heatmap */}
              <div className="card">
                <SectionTitle>Heatmap Tim — 10 Hari ICU</SectionTitle>
                <TeamHeatmap rows={heatRows} />
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {warnings.length === 0 ? (
                <div className="card text-center py-8">
                  <ScrollText size={32} className="text-text-muted mx-auto mb-2" />
                  <p className="text-sm text-text-muted">Belum ada surat peringatan yang dikirim.</p>
                </div>
              ) : (
                warnings.map((w) => {
                  const target = rows.find((r) => r.user.id === w.to_id)?.user;
                  return (
                    <div key={w.id} className="card">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm text-score-1">{w.title}</p>
                        <span className={clsx('text-[10px] px-2 py-0.5 rounded-full', w.is_read ? 'bg-score-4/15 text-score-4' : 'bg-text-muted/15 text-text-secondary')}>
                          {w.is_read ? 'Dibaca' : 'Belum dibaca'}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        Untuk: {target?.name || w.to_id} · {formatDateID(w.created_at)}
                      </p>
                      <p className="text-xs text-text-secondary mt-2 whitespace-pre-wrap">{w.message}</p>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      <WarningModal
        open={showWarning}
        onClose={() => setShowWarning(false)}
        users={candidateUsers}
        onSent={load}
      />
      <ActivityDetailModal user={detailUser} open={Boolean(detailUser)} onClose={() => setDetailUser(null)} />
    </Layout>
  );
}
