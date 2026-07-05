import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, AlertTriangle, ArrowUp, ArrowDown, Minus, ScrollText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getRHSession } from '../../lib/rhSession';
import { useNowKey } from '../../hooks/useNowKey';
import Layout from '../../components/Layout';
import TeamHeatmap from '../../components/TeamHeatmap';
import ScoreBadge from '../../components/ScoreBadge';
import ActivityDetailModal from '../../components/ActivityDetailModal';
import WarningModal from './WarningModal';
import UserManagementPanel from './UserManagementPanel';
import { FullSpinner, ErrorBox, StatusPill } from '../../components/ui';
import { SectionTitle } from '../../components/dashboard';
import { fetchAllUsers, fetchUserDaySnapshot, fetchScoreRange, fetchWarningsFrom } from '../../lib/db';
import { workWeekDates, prevWeekDate, formatDateID, levelInfo, clsx, nowDate, todayISO } from '../../lib/utils';

const ROLE_ORDER = { BM: 0, FWSS: 1, FA: 2 };

function Trend({ value }) {
  if (value > 0) return <span className="inline-flex items-center text-score-4"><ArrowUp size={16} /></span>;
  if (value < 0) return <span className="inline-flex items-center text-score-1"><ArrowDown size={16} /></span>;
  return <span className="inline-flex items-center text-text-muted"><Minus size={16} /></span>;
}

export default function RHDashboard() {
  const { user: authUser } = useAuth();
  // Fallback ke session langsung agar tidak null saat navigasi pertama kali
  const user = authUser || getRHSession();
  const navigate = useNavigate();
  const nowKey = useNowKey();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [heatRows, setHeatRows] = useState([]);
  const [heatWeeks, setHeatWeeks] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [showWarning, setShowWarning] = useState(false);
  const [detailUser, setDetailUser] = useState(null);
  const [tab, setTab] = useState('monitor');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const all = await fetchAllUsers();
      setAllUsers(all);
      const team = all.filter((u) => u.role !== 'RH');
      const todayDate = nowDate();
      const week1 = workWeekDates(prevWeekDate(todayDate)); // minggu lalu
      const week2 = workWeekDates(todayDate);               // minggu ini
      const allDates = [...week1, ...week2];
      // Trend: hari ini vs hari kerja sebelumnya
      const todayStr = todayISO();
      const todayIdx = week2.indexOf(todayStr);
      const yesterdayStr = todayIdx > 0 ? week2[todayIdx - 1] : week1[week1.length - 1];

      const enriched = await Promise.all(
        team.map(async (u) => {
          const [snap, range] = await Promise.all([
            fetchUserDaySnapshot(u),
            fetchScoreRange(u.id, allDates),
          ]);
          const byDate = new Map(range.map((r) => [r.date, r.daily_average]));
          const t = byDate.get(todayStr);
          const y = byDate.get(yesterdayStr);
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
      setHeatWeeks([week1, week2]);

      const w = await fetchWarningsFrom(user.id);
      setWarnings(w);
    } catch (e) {
      setError(e.message || 'Gagal memuat data RH.');
    } finally {
      setLoading(false);
    }
  }, [user.id, nowKey]);

  useEffect(() => { load(); }, [load]);

  const candidateUsers = rows.map((r) => r.user);

  return (
    <Layout title="Dashboard Regional Head">
      {loading ? (
        <FullSpinner label="Memuat overview regional..." />
      ) : (
        <div className="space-y-6">
          {error && <ErrorBox>{error}</ErrorBox>}

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-display text-2xl font-bold">Overview Regional</p>
              <p className="text-sm text-text-secondary">Hana RH · Regional Head</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => navigate('/summary/rh')} className="btn-teal">
                <Bot size={18} /> Generate Summary
              </button>
              <button onClick={() => setShowWarning(true)} className="btn-pink">
                <AlertTriangle size={18} /> Kirim Peringatan
              </button>
            </div>
          </div>

          <div className="flex gap-2 border-b border-hana-border">
            {[['monitor', 'Monitoring'], ['log', 'Log Peringatan'], ['users', 'Manajemen User']].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={clsx(
                  'px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
                  tab === k ? 'border-hana-teal-500 text-hana-teal-700' : 'border-transparent text-text-muted hover:text-ink'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'users' ? (
            <UserManagementPanel users={allUsers} onRefresh={load} />
          ) : tab === 'monitor' ? (
            <>
              <div className="card !p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-text-muted border-b border-hana-border bg-elevated">
                      <th className="px-4 py-3 font-semibold">Nama</th>
                      <th className="px-3 py-3 font-semibold">Cabang</th>
                      <th className="px-3 py-3 font-semibold">Skor</th>
                      <th className="px-3 py-3 font-semibold">Trend</th>
                      <th className="px-3 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const avg = r.score?.daily_average;
                      const lvl = avg != null ? levelInfo(Math.round(avg)) : null;
                      return (
                        <tr
                          key={r.user.id}
                          onClick={() => setDetailUser(r.user)}
                          className="border-b border-hana-border/70 last:border-0 cursor-pointer hover:bg-elevated transition-colors"
                          style={lvl ? { boxShadow: `inset 3px 0 0 ${lvl.color}` } : undefined}
                        >
                          <td className="px-4 py-3">
                            <p className="font-semibold leading-tight">{r.user.name}</p>
                            <p className="text-[10px] text-text-muted">{r.user.role}</p>
                          </td>
                          <td className="px-3 py-3 text-text-secondary text-xs">{r.user.branch}</td>
                          <td className="px-3 py-3">
                            {avg != null ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-display font-bold">{Number(avg).toFixed(1)}</span>
                                <ScoreBadge score={Math.round(avg)} />
                              </div>
                            ) : (
                              <ScoreBadge />
                            )}
                          </td>
                          <td className="px-3 py-3"><Trend value={r.trend} /></td>
                          <td className="px-3 py-3"><StatusPill status={r.inputStatus} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="card">
                <SectionTitle>Heatmap Tim — 2 Minggu ICU</SectionTitle>
                <TeamHeatmap rows={heatRows} weeks={heatWeeks} />
              </div>
            </>
          ) : (
            <div className="grid lg:grid-cols-2 gap-4">
              {warnings.length === 0 ? (
                <div className="card text-center py-8 lg:col-span-2">
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
                        <span className={clsx('text-[10px] px-2 py-0.5 rounded-full', w.is_read ? 'bg-score-4/15 text-score-4' : 'bg-elevated text-text-secondary')}>
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

      <WarningModal open={showWarning} onClose={() => setShowWarning(false)} users={candidateUsers} onSent={load} />
      <ActivityDetailModal user={detailUser} open={Boolean(detailUser)} onClose={() => setDetailUser(null)} />
    </Layout>
  );
}
