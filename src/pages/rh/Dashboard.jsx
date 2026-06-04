import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, AlertTriangle, ArrowUp, ArrowDown, Minus, ScrollText, UsersRound, CheckCircle2, Gauge } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNowKey } from '../../hooks/useNowKey';
import Layout from '../../components/Layout';
import TeamHeatmap from '../../components/TeamHeatmap';
import ScoreBadge from '../../components/ScoreBadge';
import ActivityDetailModal from '../../components/ActivityDetailModal';
import WarningModal from './WarningModal';
import { FullSpinner, ErrorBox, StatusPill } from '../../components/ui';
import { SectionTitle } from '../../components/dashboard';
import UnderlineTabs from '../../components/login/UnderlineTabs';
import { fetchAllUsers, fetchUserDaySnapshot, fetchScoreRange, fetchWarningsFrom } from '../../lib/db';
import { lastNDates, formatDateID, levelInfo, clsx } from '../../lib/utils';

const ROLE_ORDER = { BM: 0, FWSS: 1, FA: 2 };
const DASHBOARD_TABS = [
  { value: 'monitor', label: 'Monitoring' },
  { value: 'log', label: 'Log Surat Peringatan' },
];

function Trend({ value }) {
  if (value > 0) return <span className="inline-flex items-center text-score-4"><ArrowUp size={16} /></span>;
  if (value < 0) return <span className="inline-flex items-center text-score-1"><ArrowDown size={16} /></span>;
  return <span className="inline-flex items-center text-text-muted"><Minus size={16} /></span>;
}

function RegionalStatCard({ label, value, helper, tone = 'default', icon: Icon }) {
  const danger = tone === 'danger';
  return (
    <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-card backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
        {Icon && (
          <span className={clsx('grid h-9 w-9 place-items-center rounded-xl', danger ? 'bg-score-1/10 text-score-1' : 'bg-hana-teal-50 text-hana-teal-700')}>
            <Icon size={17} />
          </span>
        )}
      </div>
      <p className={clsx('font-display text-3xl font-extrabold leading-none', danger ? 'text-score-1' : 'text-ink')}>{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-text-secondary">{helper}</p>
    </div>
  );
}

function RegionalOverviewPanel({ user, rowsCount, averageScore, scoredCount, criticalCount, onSummary, onWarning }) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-elevated backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(135deg,rgba(4,178,146,0.14),transparent_62%)]" />
      <div className="relative">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-hana-teal-700">Regional Command Center</p>
        <h2 className="mt-3 max-w-xl font-display text-3xl font-extrabold leading-tight text-ink">
          Overview Regional
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          {user.name} - {user.branch}
        </p>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div>
            <p className="font-display text-2xl font-extrabold text-ink">{rowsCount}</p>
            <p className="text-[11px] font-medium text-text-muted">Total user</p>
          </div>
          <div>
            <p className="font-display text-2xl font-extrabold text-ink">{averageScore != null ? averageScore.toFixed(1) : '-'}</p>
            <p className="text-[11px] font-medium text-text-muted">{scoredCount} dinilai</p>
          </div>
          <div>
            <p className={clsx('font-display text-2xl font-extrabold', criticalCount ? 'text-score-1' : 'text-ink')}>{criticalCount}</p>
            <p className="text-[11px] font-medium text-text-muted">Atensi</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={onSummary} className="btn-teal">
            <Bot size={18} /> Generate Summary
          </button>
          <button onClick={onWarning} className="btn-pink">
            <AlertTriangle size={18} /> Kirim Peringatan
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RHDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const nowKey = useNowKey();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [heatRows, setHeatRows] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [showWarning, setShowWarning] = useState(false);
  const [detailUser, setDetailUser] = useState(null);
  const [tab, setTab] = useState('monitor');

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
  }, [user.id, nowKey]);

  useEffect(() => { load(); }, [load]);

  const candidateUsers = rows.map((r) => r.user);
  const scoredRows = rows.filter((r) => r.score?.daily_average != null);
  const completedRows = rows.filter((r) => r.inputStatus === 'scored' || r.inputStatus === 'draft');
  const criticalRows = rows.filter((r) => {
    const avg = r.score?.daily_average;
    return avg != null && Math.round(avg) <= 2;
  });
  const averageScore = scoredRows.length
    ? scoredRows.reduce((sum, row) => sum + Number(row.score.daily_average || 0), 0) / scoredRows.length
    : null;

  return (
    <Layout title="Dashboard Regional Head">
      {loading ? (
        <FullSpinner label="Memuat overview regional..." />
      ) : (
        <div className="space-y-6">
          {error && <ErrorBox>{error}</ErrorBox>}

          <div className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
            <RegionalOverviewPanel
              user={user}
              rowsCount={rows.length}
              averageScore={averageScore}
              scoredCount={scoredRows.length}
              criticalCount={criticalRows.length}
              onSummary={() => navigate('/summary/rh')}
              onWarning={() => setShowWarning(true)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <RegionalStatCard label="Total Tim" value={rows.length} helper="BM, FWSS, dan FA" icon={UsersRound} />
              <RegionalStatCard label="Sudah Input" value={completedRows.length} helper="Draft atau sudah dinilai" icon={CheckCircle2} />
              <RegionalStatCard label="Rata-rata Skor" value={averageScore != null ? averageScore.toFixed(1) : '-'} helper={`${scoredRows.length} data dinilai`} icon={Gauge} />
              <RegionalStatCard label="Butuh Atensi" value={criticalRows.length} helper="Skor level recovery/kritis" tone="danger" icon={AlertTriangle} />
            </div>
          </div>

          <UnderlineTabs tabs={DASHBOARD_TABS} activeValue={tab} onChange={setTab} />

          {tab === 'monitor' ? (
            <>
              <div className="card !p-0 overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-hana-border px-4 py-4">
                  <div>
                    <p className="font-display text-lg font-extrabold">Monitoring Tim</p>
                    <p className="text-xs text-text-muted">Urut berdasarkan skor harian dan level jabatan.</p>
                  </div>
                  <span className="badge-teal">{rows.length} user</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="border-b border-hana-border bg-elevated/70 text-left text-[11px] uppercase tracking-wide text-text-muted">
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
                            className="cursor-pointer border-b border-hana-border/70 transition-colors last:border-0 hover:bg-elevated/70"
                            style={lvl ? { boxShadow: `inset 3px 0 0 ${lvl.color}` } : undefined}
                          >
                            <td className="px-4 py-3">
                              <p className="font-bold leading-tight">{r.user.name}</p>
                              <p className="text-[10px] font-semibold text-text-muted">{r.user.role}</p>
                            </td>
                            <td className="px-3 py-3 text-xs text-text-secondary">{r.user.branch}</td>
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
              </div>

              <div className="card">
                <SectionTitle>Heatmap Tim - 10 Hari ICU</SectionTitle>
                <TeamHeatmap rows={heatRows} />
              </div>
            </>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {warnings.length === 0 ? (
                <div className="card py-10 text-center lg:col-span-2">
                  <ScrollText size={32} className="mx-auto mb-2 text-text-muted" />
                  <p className="text-sm text-text-muted">Belum ada surat peringatan yang dikirim.</p>
                </div>
              ) : (
                warnings.map((w) => {
                  const target = rows.find((r) => r.user.id === w.to_id)?.user;
                  return (
                    <div key={w.id} className="card">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-score-1">{w.title}</p>
                        <span className={clsx('rounded-full px-2 py-0.5 text-[10px] font-semibold', w.is_read ? 'bg-score-4/15 text-score-4' : 'bg-elevated text-text-secondary')}>
                          {w.is_read ? 'Dibaca' : 'Belum dibaca'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-text-muted">
                        Untuk: {target?.name || w.to_id} - {formatDateID(w.created_at)}
                      </p>
                      <p className="mt-3 whitespace-pre-wrap border-t border-hana-border/70 pt-3 text-xs leading-relaxed text-text-secondary">{w.message}</p>
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
