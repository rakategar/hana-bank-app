import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, UsersRound, CheckCircle2, Gauge, AlertTriangle, Search, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useNowKey } from '../../hooks/useNowKey';
import { useSalesDashboard } from '../../hooks/useSalesDashboard';
import Layout from '../../components/Layout';
import ActivityWatch from '../../components/ActivityWatch';
import ActivityDetailModal from '../../components/ActivityDetailModal';
import WarningBanner from '../../components/WarningBanner';
import ScoreBadge from '../../components/ScoreBadge';
import {
  DashboardIntro,
  NotesCard,
} from '../../components/dashboard';
import { StatusPill, Select, Pagination, DashboardSkeleton, Avatar } from '../../components/ui';
import { fetchSubordinates, fetchUserDaySnapshot } from '../../lib/db';
import { clsx, ROLE_LABELS, levelInfo, getFirstName } from '../../lib/utils';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Semua Status' },
  { value: 'scored', label: 'Sudah Dinilai' },
  { value: 'draft', label: 'Draft Tersimpan' },
  { value: 'belum', label: 'Belum Diisi' },
  { value: 'attention', label: 'Butuh Atensi' },
];

function TeamStatCard({ label, value, helper, icon: Icon, tone }) {
  const danger = tone === 'danger';
  return (
    <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-card backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
        <span className={clsx('grid h-9 w-9 place-items-center rounded-xl', danger ? 'bg-score-1/10 text-score-1' : 'bg-hana-teal-50 text-hana-teal-700')}>
          <Icon size={17} />
        </span>
      </div>
      <p className={clsx('font-display text-3xl font-extrabold leading-none', danger ? 'text-score-1' : 'text-ink')}>{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-text-secondary">{helper}</p>
    </div>
  );
}

export default function FWSSDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const nowKey = useNowKey();
  const {
    loading: ownLoading,
    error,
    warnings,
    notes,
    reload,
  } = useSalesDashboard(user, nowKey);

  const [teamLoading, setTeamLoading] = useState(true);
  const [team, setTeam] = useState([]);
  const [detailUser, setDetailUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [monitorPage, setMonitorPage] = useState(1);

  const loadTeam = useCallback(async () => {
    setTeamLoading(true);
    try {
      const subs = await fetchSubordinates(user.id);
      const snaps = await Promise.all(subs.map((sub) => fetchUserDaySnapshot(sub)));
      setTeam(snaps);
    } catch (e) {
      toast.error(e.message || 'Gagal memuat data FA.');
    } finally {
      setTeamLoading(false);
    }
  }, [user.id, nowKey]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  useEffect(() => {
    setMonitorPage(1);
  }, [searchQuery, statusFilter]);

  const unreadCount = warnings.filter((w) => !w.is_read).length;
  const loading = ownLoading || teamLoading;

  const totalMembers = team.length;
  const completedCount = team.filter((row) => row.inputStatus === 'scored' || row.inputStatus === 'draft').length;
  const scoredRows = team.filter((row) => row.score?.daily_average != null);
  const averageScore = scoredRows.length
    ? scoredRows.reduce((sum, row) => sum + Number(row.score.daily_average || 0), 0) / scoredRows.length
    : null;
  const attentionCount = team.filter((row) => {
    const avg = row.score?.daily_average;
    return row.inputStatus === 'belum' || (avg != null && Math.round(avg) <= 2);
  }).length;
  const completionRate = totalMembers > 0 ? Math.round((completedCount / totalMembers) * 100) : 0;

  const filteredRows = useMemo(() => {
    return team
      .filter((row) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const nameMatch = row.user.name?.toLowerCase().includes(q);
          const branchMatch = row.user.branch?.toLowerCase().includes(q);
          if (!nameMatch && !branchMatch) return false;
        }

        if (statusFilter !== 'ALL') {
          if (statusFilter === 'attention') {
            const avg = row.score?.daily_average;
            const needsAttention = row.inputStatus === 'belum' || (avg != null && Math.round(avg) <= 2);
            if (!needsAttention) return false;
          } else if (row.inputStatus !== statusFilter) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => (b.score?.daily_average ?? -1) - (a.score?.daily_average ?? -1));
  }, [team, searchQuery, statusFilter]);

  const monitorPerPage = 5;
  const monitorTotalPages = Math.ceil(filteredRows.length / monitorPerPage);
  const paginatedMonitor = filteredRows.slice((monitorPage - 1) * monitorPerPage, monitorPage * monitorPerPage);
  const roleLabel = ROLE_LABELS[user.role] || user.role;

  return (
    <Layout title="Dashboard FWSS" unreadCount={unreadCount}>
      {loading ? (
        <DashboardSkeleton stats={4} showTabs={false} />
      ) : (
        <div className="space-y-6">
          <WarningBanner warnings={warnings} onRead={reload} />

          <DashboardIntro
            title={`Halo, ${getFirstName(user.name)}`}
            subtitle={`${roleLabel} - ${user.branch}`}
          />

          {notes.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Catatan dari Branch Manager</p>
              <NotesCard notes={notes} fromLabel="BM" />
            </div>
          )}

          <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
            <TeamStatCard label="Total FA" value={totalMembers} helper="Financial Advisor dalam supervisi" icon={UsersRound} />
            <TeamStatCard label="Penyelesaian Input" value={`${completionRate}%`} helper={`${completedCount} dari ${totalMembers} selesai`} icon={CheckCircle2} />
            <TeamStatCard label="Rata-rata Skor FA" value={averageScore != null ? averageScore.toFixed(1) : '-'} helper={`${scoredRows.length} FA dinilai hari ini`} icon={Gauge} />
            <TeamStatCard label="Butuh Atensi" value={attentionCount} helper="Belum input atau skor kritis" icon={AlertTriangle} tone={attentionCount > 0 ? 'danger' : undefined} />
          </div>

          <ActivityWatch userId={user.id} role={user.role} />

          <div className="card !p-0 overflow-hidden">
            <div className="border-b border-hana-border px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-display text-lg font-extrabold text-ink">Monitoring FA</p>
                  <p className="text-xs text-text-muted">Urut berdasarkan skor harian dan status input aktivitas.</p>
                </div>
                <button
                  onClick={() => navigate('/summary/fwss')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-hana-teal-100 bg-hana-teal-50/50 px-3.5 py-2 text-xs font-bold text-hana-teal-700 shadow-sm transition-colors hover:bg-hana-teal-50 self-start sm:self-center"
                >
                  <Bot size={14} />
                  <span>Generate Summary FA</span>
                </button>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Cari nama atau cabang..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="w-full py-2 pl-9 pr-4 text-xs"
                  />
                  <span className="absolute left-3 top-2.5 text-text-muted">
                    <Search size={14} />
                  </span>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-text-muted hover:text-ink"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <Select
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={STATUS_OPTIONS}
                  className="w-48 sm:w-56"
                />
              </div>
            </div>

            <div className="overflow-x-auto px-4 py-2 sm:px-6">
              <table className="w-full min-w-[720px] border-separate border-spacing-y-2 text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-text-muted">
                    <th className="py-1.5 pl-6 pr-4 font-semibold">Nama</th>
                    <th className="px-4 py-1.5 font-semibold">Skor Harian</th>
                    <th className="px-4 py-1.5 font-semibold">Progress</th>
                    <th className="py-1.5 pl-4 pr-6 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMonitor.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="rounded-2xl border border-hana-border/30 bg-white/30 py-12 text-center text-text-muted">
                        <UsersRound className="mx-auto mb-2 text-text-muted/50" size={32} />
                        <p className="text-sm font-bold text-ink">Tidak ada FA ditemukan</p>
                        <p className="mt-1 text-xs text-text-muted">Cari dengan kata kunci lain atau ubah filter status.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedMonitor.map((row) => {
                      const avg = row.score?.daily_average;
                      const lvl = avg != null ? levelInfo(Math.round(avg)) : null;
                      return (
                        <tr key={row.user.id} onClick={() => setDetailUser(row.user)} className="group cursor-pointer transition-all">
                          <td className="relative rounded-l-2xl border-y border-l border-hana-border/30 bg-white py-4 pl-6 pr-4 transition-all duration-150">
                            <div className="flex items-center gap-3">
                              <Avatar name={row.user.name} />
                              <div className="min-w-0">
                                <p className="truncate font-bold leading-tight text-ink">{row.user.name}</p>
                                <div className="mt-0.5 flex items-center gap-1.5">
                                  <span className="inline-flex items-center rounded border border-slate-100 bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-text-secondary">
                                    {row.user.role}
                                  </span>
                                  <span className="text-[8px] text-text-muted/50">&bull;</span>
                                  <span className="text-[10px] text-text-secondary/70">{row.user.branch}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="border-y border-hana-border/30 bg-white px-4 py-4 transition-all duration-150">
                            {avg != null ? (
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="font-display text-2xl font-extrabold leading-none text-ink">{Number(avg).toFixed(1)}</span>
                                  <ScoreBadge score={Math.round(avg)} />
                                </div>
                                <div className="mt-1.5 h-1.5 w-full max-w-[80px] overflow-hidden rounded-full bg-slate-100">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${Math.min(100, (Number(avg) / 5) * 100)}%`,
                                      backgroundColor: lvl?.color || '#52616B',
                                    }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <ScoreBadge />
                            )}
                          </td>

                          <td className="border-y border-hana-border/30 bg-white px-4 py-4 transition-all duration-150">
                            <span className="text-xs font-semibold text-text-secondary">
                              {row.filled}/{row.totalSlots} slot selesai
                            </span>
                          </td>

                          <td className="rounded-r-2xl border-y border-r border-hana-border/30 bg-white py-4 pl-4 pr-6 transition-all duration-150">
                            <StatusPill status={row.inputStatus} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={monitorPage}
              totalPages={monitorTotalPages}
              onPageChange={setMonitorPage}
              totalItems={filteredRows.length}
              itemsPerPage={monitorPerPage}
            />
          </div>
        </div>
      )}

      <ActivityDetailModal user={detailUser} open={Boolean(detailUser)} onClose={() => setDetailUser(null)} />
    </Layout>
  );
}
