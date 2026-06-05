import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, UsersRound, CheckCircle2, Gauge, AlertTriangle, Search, X, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useNowKey } from '../../hooks/useNowKey';
import Layout from '../../components/Layout';
import ActivityDetailModal from '../../components/ActivityDetailModal';
import WarningBanner from '../../components/WarningBanner';
import ActivityWatch from '../../components/ActivityWatch';
import ScoreBadge from '../../components/ScoreBadge';
import { StatusPill, Select, Pagination, DashboardSkeleton, Avatar } from '../../components/ui';
import { DashboardIntro, NotesCard, SectionTitle } from '../../components/dashboard';
import { fetchSubordinates, fetchUserDaySnapshot, fetchNotesForUser, fetchWarningsFor } from '../../lib/db';
import { clsx, ROLE_LABELS, getFirstName, levelInfo } from '../../lib/utils';

const ROLE_OPTIONS = [
  { value: 'ALL', label: 'Semua Jabatan' },
  { value: 'FWSS', label: 'FW Sales Supervisor' },
  { value: 'FA', label: 'Financial Advisor' },
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Semua Status' },
  { value: 'scored', label: 'Sudah Dinilai' },
  { value: 'draft', label: 'Draft Tersimpan' },
  { value: 'belum', label: 'Belum Diisi' },
  { value: 'attention', label: 'Butuh Atensi' },
];

/* ───────── Branch Stat Card ───────── */
function BranchStatCard({ label, value, helper, icon: Icon, tone }) {
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

export default function BMDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const nowKey = useNowKey();
  const [loading, setLoading] = useState(true);
  const [tree, setTree] = useState([]);
  const [notes, setNotes] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [detailUser, setDetailUser] = useState(null);

  // Search, Filters & Pagination States
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [monitorPage, setMonitorPage] = useState(1);

  useEffect(() => {
    setMonitorPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch subordinates (FWSS)
      const fwssList = await fetchSubordinates(user.id);
      
      // Fetch snapshot data recursively
      const built = await Promise.all(
        fwssList.map(async (fwss) => {
          const fwssSnap = await fetchUserDaySnapshot(fwss);
          const fas = await fetchSubordinates(fwss.id);
          const faSnaps = await Promise.all(fas.map((fa) => fetchUserDaySnapshot(fa)));
          return { fwss: fwssSnap, fas: faSnaps };
        })
      );
      setTree(built);

      // Fetch notes from RH and warnings for this BM
      const [n, w] = await Promise.all([
        fetchNotesForUser(user.id),
        fetchWarningsFor(user.id),
      ]);
      setNotes(n);
      setWarnings(w);
    } catch (e) {
      toast.error(e.message || 'Gagal memuat data dashboard BM.');
    } finally {
      setLoading(false);
    }
  }, [user.id, nowKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const unreadCount = warnings.filter((w) => !w.is_read).length;

  /* ── Computed Stats & Flattening ── */
  const flatRows = [];
  tree.forEach(({ fwss, fas }) => {
    flatRows.push(fwss);
    fas.forEach((fa) => {
      flatRows.push(fa);
    });
  });

  const totalMembers = flatRows.length;

  // Completed input count (scored or draft)
  let completedCount = 0;
  let scoreSum = 0;
  let scoreCount = 0;
  let attentionCount = 0;

  flatRows.forEach((r) => {
    if (r.inputStatus === 'scored' || r.inputStatus === 'draft') completedCount++;
    if (r.score?.daily_average != null) {
      scoreSum += r.score.daily_average;
      scoreCount++;
    }
    const avg = r.score?.daily_average;
    if (r.inputStatus === 'belum' || (avg != null && Math.round(avg) <= 2)) {
      attentionCount++;
    }
  });

  const completionRate = totalMembers > 0 ? Math.round((completedCount / totalMembers) * 100) : 0;
  const averageScore = scoreCount > 0 ? scoreSum / scoreCount : null;

  // Filter & Sort Rows
  const filteredRows = flatRows.filter((r) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = r.user.name?.toLowerCase().includes(q);
      const branchMatch = r.user.branch?.toLowerCase().includes(q);
      if (!nameMatch && !branchMatch) return false;
    }

    if (roleFilter !== 'ALL' && r.user.role !== roleFilter) return false;

    if (statusFilter !== 'ALL') {
      if (statusFilter === 'scored' && r.inputStatus !== 'scored') return false;
      if (statusFilter === 'draft' && r.inputStatus !== 'draft') return false;
      if (statusFilter === 'belum' && r.inputStatus !== 'belum') return false;
      if (statusFilter === 'attention') {
        const avg = r.score?.daily_average;
        const needsAttention = r.inputStatus === 'belum' || (avg != null && Math.round(avg) <= 2);
        if (!needsAttention) return false;
      }
    }
    return true;
  });

  const ROLE_ORDER = { FWSS: 0, FA: 1 };
  filteredRows.sort((a, b) => {
    const sa = a.score?.daily_average ?? -1;
    const sb = b.score?.daily_average ?? -1;
    if (sb !== sa) return sb - sa;
    return (ROLE_ORDER[a.user.role] ?? 9) - (ROLE_ORDER[b.user.role] ?? 9);
  });

  // Pagination Computations
  const monitorPerPage = 5;
  const monitorTotalPages = Math.ceil(filteredRows.length / monitorPerPage);
  const paginatedMonitor = filteredRows.slice((monitorPage - 1) * monitorPerPage, monitorPage * monitorPerPage);

  return (
    <Layout title="Dashboard BM" unreadCount={unreadCount}>
      {loading ? (
        <DashboardSkeleton stats={4} showTabs={false} />
      ) : (
        <div className="space-y-6">
          {/* Warning Banner */}
          <WarningBanner warnings={warnings} onRead={loadData} />

          {/* Header Intro */}
          <DashboardIntro
            title={`Halo, ${getFirstName(user.name)}`}
            subtitle={`${ROLE_LABELS[user.role] || user.role} - ${user.branch}`}
          />

          {/* Notes from RH */}
          {notes.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Catatan dari Regional Head</p>
              <NotesCard notes={notes} fromLabel="RH" />
            </div>
          )}

          {/* Stats Analytics */}
          <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
            <BranchStatCard
              label="Total Tim Cabang"
              value={totalMembers}
              helper="FWSS dan Financial Advisor"
              icon={UsersRound}
            />
            <BranchStatCard
              label="Penyelesaian Input"
              value={`${completionRate}%`}
              helper={`${completedCount} dari ${totalMembers} selesai`}
              icon={CheckCircle2}
            />
            <BranchStatCard
              label="Rata-rata Skor Cabang"
              value={averageScore != null ? averageScore.toFixed(1) : '–'}
              helper={`${scoreCount} dinilai hari ini`}
              icon={Gauge}
            />
            <BranchStatCard
              label="Butuh Atensi"
              value={attentionCount}
              helper="Skor kritis atau belum input"
              icon={AlertTriangle}
              tone={attentionCount > 0 ? 'danger' : undefined}
            />
          </div>

          {/* Activity Watch (Timer) */}
          <ActivityWatch userId={user.id} role={user.role} />

          {/* Monitoring Team Section */}
          <div className="space-y-4">
            {/* Standardized Table View */}
            <div className="card !p-0 overflow-hidden">
              <div className="border-b border-hana-border px-4 py-4 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-extrabold text-ink">Monitoring Tim</p>
                    <p className="text-xs text-text-muted">Urut berdasarkan skor harian dan level jabatan.</p>
                  </div>
                  <button
                    onClick={() => navigate('/summary/bm')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-hana-teal-100 bg-hana-teal-50/50 px-3.5 py-2 text-xs font-bold text-hana-teal-700 hover:bg-hana-teal-50 transition-colors shadow-sm self-start sm:self-center"
                  >
                    <Bot size={14} />
                    <span>Generate Summary Tim</span>
                  </button>
                </div>

                {/* Search & Filters Bar */}
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Cari nama..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs"
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
                  <div className="flex flex-wrap gap-2">
                    <Select
                      value={roleFilter}
                      onChange={setRoleFilter}
                      options={ROLE_OPTIONS}
                      className="w-40 sm:w-48"
                    />
                    <Select
                      value={statusFilter}
                      onChange={setStatusFilter}
                      options={STATUS_OPTIONS}
                      className="w-48 sm:w-56"
                    />
                  </div>
                </div>
              </div>

              {/* Monitoring Table Grid */}
              <div className="overflow-x-auto px-4 sm:px-6 py-2">
                <table className="w-full min-w-[760px] text-sm border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-text-muted">
                      <th className="pl-6 pr-4 py-1.5 font-semibold">Nama</th>
                      <th className="px-4 py-1.5 font-semibold">Skor Harian</th>
                      <th className="px-4 py-1.5 font-semibold">Progress</th>
                      <th className="pr-6 pl-4 py-1.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedMonitor.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-text-muted bg-white/30 border border-hana-border/30 rounded-2xl">
                          <UsersRound className="mx-auto mb-2 text-text-muted/50" size={32} />
                          <p className="text-sm font-bold text-ink">Tidak ada anggota tim ditemukan</p>
                          <p className="text-xs text-text-muted mt-1">Cari dengan kata kunci lain atau ubah filter status/jabatan.</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedMonitor.map((r) => {
                        const avg = r.score?.daily_average;
                        const lvl = avg != null ? levelInfo(Math.round(avg)) : null;
                        return (
                          <tr
                            key={r.user.id}
                            onClick={() => setDetailUser(r.user)}
                            className="group cursor-pointer transition-all"
                          >
                            {/* Nama Cell */}
                            <td className="relative pl-6 pr-4 py-4 bg-white border-y border-l border-hana-border/30 rounded-l-2xl transition-all duration-150">
                              {lvl && (
                                <span
                                  className="absolute left-0 top-0 bottom-0 w-1"
                                  style={{ backgroundColor: lvl.color }}
                                />
                              )}
                              <div className="flex items-center gap-3">
                                <Avatar name={r.user.name} />
                                <div className="min-w-0">
                                  <p className="font-bold leading-tight text-ink truncate">{r.user.name}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="inline-flex items-center rounded bg-slate-50 border border-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-text-secondary uppercase">
                                      {r.user.role}
                                    </span>
                                    <span className="text-[8px] text-text-muted/50">&bull;</span>
                                    <span className="text-[10px] text-text-secondary/70">
                                      {r.user.branch}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Skor Cell */}
                            <td className="px-4 py-4 bg-white border-y border-hana-border/30 transition-all duration-150">
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

                            {/* Progress Cell */}
                            <td className="px-4 py-4 bg-white border-y border-hana-border/30 transition-all duration-150">
                              <span className="text-xs font-semibold text-text-secondary">
                                {r.filled}/{r.totalSlots} slot selesai
                              </span>
                            </td>

                            {/* Status Cell */}
                            <td className="pr-6 pl-4 py-4 bg-white border-y border-r border-hana-border/30 rounded-r-2xl transition-all duration-150">
                              <StatusPill status={r.inputStatus} />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <Pagination
                currentPage={monitorPage}
                totalPages={monitorTotalPages}
                onPageChange={setMonitorPage}
                totalItems={filteredRows.length}
                itemsPerPage={monitorPerPage}
              />
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <ActivityDetailModal user={detailUser} open={Boolean(detailUser)} onClose={() => setDetailUser(null)} />
    </Layout>
  );
}
