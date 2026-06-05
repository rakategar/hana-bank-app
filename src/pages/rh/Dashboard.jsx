import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, AlertTriangle, ArrowUp, ArrowDown, Minus, ScrollText, UsersRound, CheckCircle2, Gauge, Search, X, Calendar, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useNowKey } from '../../hooks/useNowKey';
import Layout from '../../components/Layout';
import TeamHeatmap from '../../components/TeamHeatmap';
import ScoreBadge from '../../components/ScoreBadge';
import ActivityDetailModal from '../../components/ActivityDetailModal';
import WarningModal from './WarningModal';
import { StatusPill, Select, Modal, Pagination, DashboardSkeleton, Avatar } from '../../components/ui';
import { SectionTitle } from '../../components/dashboard';
import UnderlineTabs from '../../components/login/UnderlineTabs';
import { fetchAllUsers, fetchUserDaySnapshot, fetchScoreRange, fetchWarningsFrom } from '../../lib/db';
import { lastNDates, formatDateID, levelInfo, clsx } from '../../lib/utils';

const ROLE_ORDER = { BM: 0, FWSS: 1, FA: 2 };
const DASHBOARD_TABS = [
  { value: 'monitor', label: 'Monitoring' },
  { value: 'log', label: 'Log Surat Peringatan' },
];

const ROLE_OPTIONS = [
  { value: 'ALL', label: 'Semua Jabatan' },
  { value: 'BM', label: 'Branch Manager' },
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

/* ───────── Trend Badge ───────── */
function TrendBadge({ value }) {
  if (value > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-score-4/10 px-2 py-0.5 text-xs font-bold text-score-4">
        <ArrowUp size={12} strokeWidth={2.5} />
        <span>+{value.toFixed(1)}</span>
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-score-1/10 px-2 py-0.5 text-xs font-bold text-score-1">
        <ArrowDown size={12} strokeWidth={2.5} />
        <span>{value.toFixed(1)}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-elevated px-2.5 py-0.5 text-[11px] font-semibold text-text-muted">
      <Minus size={12} strokeWidth={2.5} />
      <span>Tetap</span>
    </span>
  );
}

/* ───────── Warning Detail Modal ───────── */
function WarningDetailModal({ warning, target, open, onClose }) {
  if (!warning) return null;

  return (
    <Modal open={open} onClose={onClose} title="Detail Surat Peringatan" maxWidth="max-w-xl">
      <div className="space-y-4">
        {/* Recipient & Metadata block */}
        <div className="flex items-start justify-between gap-4 border-b border-hana-border pb-4">
          <div className="flex items-center gap-3">
            <Avatar name={target?.name || warning.to_id} />
            <div className="min-w-0">
              <p className="font-bold text-ink leading-snug">
                {target?.name || warning.to_id}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-muted mt-0.5">
                {target && (
                  <>
                    <span className="font-semibold text-text-secondary uppercase">{target.role}</span>
                    <span>&bull;</span>
                    <span>{target.branch}</span>
                    <span>&bull;</span>
                  </>
                )}
                <span>ID: {warning.to_id}</span>
              </div>
            </div>
          </div>

          <span
            className={clsx(
              'rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide border shrink-0',
              warning.is_read
                ? 'bg-emerald-50 border-emerald-200/50 text-emerald-600'
                : 'bg-rose-50 border-rose-200/50 text-rose-600 animate-pulse'
            )}
          >
            {warning.is_read ? 'Dibaca' : 'Belum Dibaca'}
          </span>
        </div>

        {/* Message Content */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-text-secondary">
            <Calendar size={14} className="text-text-muted" />
            <span className="text-xs font-semibold">Dikirim pada: {formatDateID(warning.created_at)}</span>
          </div>
          <h4 className="font-display text-base font-extrabold text-score-1">{warning.title}</h4>
          <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">{warning.message}</p>
        </div>
      </div>
    </Modal>
  );
}

/* ───────── Stat Card ───────── */
function RegionalStatCard({ label, value, helper, icon: Icon, tone }) {
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

/* ───────── Regional Header ───────── */
function RegionalHeader({ user, onSummary, onWarning }) {
  const today = new Date();
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const dateStr = `${days[today.getDay()]}, ${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h2 className="font-display text-2xl font-extrabold leading-tight text-ink sm:text-3xl">
          Halo, {user.name.split(' ')[0]}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          {user.branch} &bull; {dateStr}
        </p>
      </div>
      <div className="flex shrink-0 gap-2.5">
        <button onClick={onSummary} className="btn-teal !min-h-9 !px-3.5 !py-1.5 text-xs">
          <Bot size={15} /> Generate Summary
        </button>
        <button onClick={onWarning} className="btn-pink !min-h-9 !px-3.5 !py-1.5 text-xs">
          <AlertTriangle size={15} /> Kirim Peringatan
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
export default function RHDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const nowKey = useNowKey();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [heatRows, setHeatRows] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [showWarning, setShowWarning] = useState(false);
  const [detailUser, setDetailUser] = useState(null);
  const [tab, setTab] = useState('monitor');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [warningSearchQuery, setWarningSearchQuery] = useState('');
  const [warningStatusFilter, setWarningStatusFilter] = useState('ALL');
  const [detailWarning, setDetailWarning] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [detailDate, setDetailDate] = useState(null);
  const [monitorPage, setMonitorPage] = useState(1);
  const [warningPage, setWarningPage] = useState(1);

  useEffect(() => {
    setMonitorPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  useEffect(() => {
    setWarningPage(1);
  }, [warningSearchQuery, warningStatusFilter]);

  const load = useCallback(async () => {
    setLoading(true);
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
      toast.error(e.message || 'Gagal memuat data RH.');
    } finally {
      setLoading(false);
    }
  }, [user.id, nowKey]);

  useEffect(() => { load(); }, [load]);

  const candidateUsers = rows.map((r) => r.user);

  /* ── Computed Stats ── */
  const scoredRows = rows.filter((r) => r.score?.daily_average != null);
  const completedRows = rows.filter((r) => r.inputStatus === 'scored' || r.inputStatus === 'draft');
  const criticalRows = rows.filter((r) => {
    const avg = r.score?.daily_average;
    return avg != null && Math.round(avg) <= 2;
  });
  const averageScore = scoredRows.length
    ? scoredRows.reduce((sum, row) => sum + Number(row.score.daily_average || 0), 0) / scoredRows.length
    : null;

  /* ── Filter: Monitoring ── */
  const filteredRows = rows.filter((r) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = r.user.name?.toLowerCase().includes(q);
      const branchMatch = r.user.branch?.toLowerCase().includes(q);
      if (!nameMatch && !branchMatch) return false;
    }
    if (roleFilter !== 'ALL' && r.user.role !== roleFilter) return false;
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'attention') {
        const avg = r.score?.daily_average;
        if (avg == null || Math.round(avg) > 2) return false;
      } else if (r.inputStatus !== statusFilter) {
        return false;
      }
    }
    return true;
  });

  /* ── Filter: Warnings ── */
  const filteredWarnings = warnings.filter((w) => {
    const target = rows.find((r) => r.user.id === w.to_id)?.user;
    const targetName = target?.name || w.to_id || '';
    const title = w.title || '';
    const message = w.message || '';

    if (warningSearchQuery.trim()) {
      const q = warningSearchQuery.toLowerCase();
      const nameMatch = targetName.toLowerCase().includes(q);
      const titleMatch = title.toLowerCase().includes(q);
      const msgMatch = message.toLowerCase().includes(q);
      if (!nameMatch && !titleMatch && !msgMatch) return false;
    }

    if (warningStatusFilter !== 'ALL') {
      const isRead = w.is_read;
      if (warningStatusFilter === 'read' && !isRead) return false;
      if (warningStatusFilter === 'unread' && isRead) return false;
    }

    return true;
  });

  /* ── Pagination: Monitor ── */
  const monitorPerPage = 5;
  const monitorTotalPages = Math.ceil(filteredRows.length / monitorPerPage);
  const paginatedMonitor = filteredRows.slice((monitorPage - 1) * monitorPerPage, monitorPage * monitorPerPage);

  /* ── Pagination: Warnings ── */
  const warningPerPage = 5;
  const warningTotalPages = Math.ceil(filteredWarnings.length / warningPerPage);
  const paginatedWarnings = filteredWarnings.slice((warningPage - 1) * warningPerPage, warningPage * warningPerPage);

  return (
    <Layout title="Dashboard Regional Head">
      {loading ? (
        <DashboardSkeleton stats={4} />
      ) : (
        <div className="space-y-6">

          {/* ── Header ── */}
          <RegionalHeader
            user={user}
            onSummary={() => navigate('/summary/rh')}
            onWarning={() => setShowWarning(true)}
          />

          {/* ── Stat Cards ── */}
          <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
            <RegionalStatCard label="Total Tim" value={rows.length} helper="BM, FWSS, dan FA" icon={UsersRound} />
            <RegionalStatCard label="Sudah Input" value={completedRows.length} helper="Draft atau sudah dinilai" icon={CheckCircle2} />
            <RegionalStatCard label="Rata-rata Skor" value={averageScore != null ? averageScore.toFixed(1) : '–'} helper={`${scoredRows.length} data dinilai`} icon={Gauge} />
            <RegionalStatCard label="Butuh Atensi" value={criticalRows.length} helper="Skor level recovery/kritis" tone="danger" icon={AlertTriangle} />
          </div>

          {/* ── Tabs ── */}
          <UnderlineTabs tabs={DASHBOARD_TABS} activeValue={tab} onChange={setTab} />

          {tab === 'monitor' ? (
            <>
              {/* ── Monitoring Table ── */}
              <div className="card !p-0 overflow-hidden">
                <div className="border-b border-hana-border px-4 py-4 sm:px-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="font-display text-lg font-extrabold text-ink">Monitoring Tim</p>
                      <p className="text-xs text-text-muted">Urut berdasarkan skor harian dan level jabatan.</p>
                    </div>
                    <button
                      onClick={() => setShowHeatmap(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-hana-teal-100 bg-hana-teal-50/50 px-3.5 py-2 text-xs font-bold text-hana-teal-700 hover:bg-hana-teal-50 transition-colors shadow-sm self-start sm:self-center"
                    >
                      <Calendar size={14} />
                      <span>Heatmap 10 Hari ICU</span>
                    </button>
                  </div>

                  {/* Search & Filters Bar */}
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Cari nama atau cabang..."
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

                <div className="overflow-x-auto px-4 sm:px-6 py-2">
                  <table className="w-full min-w-[760px] text-sm border-separate border-spacing-y-2">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-text-muted">
                        <th className="pl-6 pr-4 py-1.5 font-semibold">Nama</th>
                        <th className="px-4 py-1.5 font-semibold">Skor Harian</th>
                        <th className="px-4 py-1.5 font-semibold">Trend</th>
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

                              {/* Trend Cell */}
                              <td className="px-4 py-4 bg-white border-y border-hana-border/30 transition-all duration-150">
                                <TrendBadge value={r.trend} />
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
                <Pagination
                  currentPage={monitorPage}
                  totalPages={monitorTotalPages}
                  onPageChange={setMonitorPage}
                  totalItems={filteredRows.length}
                  itemsPerPage={monitorPerPage}
                />
              </div>
            </>
          ) : (
            /* ── Log Surat Peringatan ── */
            <div className="card !p-0 overflow-hidden">
              <div className="border-b border-hana-border px-4 py-4 sm:px-6">
                <div>
                  <p className="font-display text-lg font-extrabold text-ink">Log Surat Peringatan</p>
                  <p className="text-xs text-text-muted">Daftar surat peringatan yang telah dikirim ke anggota tim regional.</p>
                </div>

                {/* Warning Search & Filters Bar */}
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Cari penerima atau judul..."
                      value={warningSearchQuery}
                      onChange={(e) => setWarningSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs"
                    />
                    <span className="absolute left-3 top-2.5 text-text-muted">
                      <Search size={14} />
                    </span>
                    {warningSearchQuery && (
                      <button
                        onClick={() => setWarningSearchQuery('')}
                        className="absolute right-3 top-2.5 text-text-muted hover:text-ink"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Select
                      value={warningStatusFilter}
                      onChange={setWarningStatusFilter}
                      options={[
                        { value: 'ALL', label: 'Semua Status' },
                        { value: 'read', label: 'Sudah Dibaca' },
                        { value: 'unread', label: 'Belum Dibaca' },
                      ]}
                      className="w-48 sm:w-56"
                    />
                  </div>
                </div>
              </div>

              {/* Warning Table */}
              <div className="overflow-x-auto px-4 sm:px-6 py-2">
                <table className="w-full min-w-[760px] text-sm border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-text-muted">
                      <th className="pl-6 pr-4 py-1.5 font-semibold">Penerima</th>
                      <th className="px-4 py-1.5 font-semibold">Judul Peringatan</th>
                      <th className="px-4 py-1.5 font-semibold">Isi Singkat</th>
                      <th className="px-4 py-1.5 font-semibold">Tanggal Kirim</th>
                      <th className="px-4 py-1.5 font-semibold">Status</th>
                      <th className="pr-6 pl-4 py-1.5 font-semibold text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedWarnings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-text-muted bg-white/30 border border-hana-border/30 rounded-2xl">
                          <ScrollText className="mx-auto mb-2 text-text-muted/50" size={32} />
                          <p className="text-sm font-bold text-ink">Tidak ada surat peringatan ditemukan</p>
                          <p className="text-xs text-text-muted mt-1">Cari dengan kata kunci lain atau ubah filter status.</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedWarnings.map((w) => {
                        const target = rows.find((r) => r.user.id === w.to_id)?.user;
                        return (
                          <tr
                            key={w.id}
                            onClick={() => setDetailWarning(w)}
                            className="group cursor-pointer transition-all"
                          >
                            {/* Penerima Cell */}
                            <td className="relative pl-6 pr-4 py-4 bg-white border-y border-l border-hana-border/30 rounded-l-2xl transition-all duration-150">
                              {!w.is_read && (
                                <span className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />
                              )}
                              <div className="flex items-center gap-3">
                                <Avatar name={target?.name || w.to_id} />
                                <div className="min-w-0">
                                  <p className="font-bold leading-snug text-ink truncate">{target?.name || w.to_id}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {target ? (
                                      <>
                                        <span className="inline-flex items-center rounded bg-slate-50 border border-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-text-secondary uppercase">
                                          {target.role}
                                        </span>
                                        <span className="text-[8px] text-text-muted/50">&bull;</span>
                                        <span className="text-[10px] text-text-secondary/70">
                                          {target.branch}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-[10px] text-text-secondary/70">
                                        ID: {w.to_id}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Judul Cell */}
                            <td className="px-4 py-4 bg-white border-y border-hana-border/30 text-xs sm:text-sm font-bold text-ink transition-all duration-150 max-w-[200px] truncate">
                              {w.title}
                            </td>

                            {/* Isi Singkat Cell */}
                            <td className="px-4 py-4 bg-white border-y border-hana-border/30 text-xs text-text-secondary transition-all duration-150 max-w-[250px] truncate font-medium">
                              {w.message}
                            </td>

                            {/* Tanggal Cell */}
                            <td className="px-4 py-4 bg-white border-y border-hana-border/30 text-xs font-semibold text-text-secondary transition-all duration-150">
                              {formatDateID(w.created_at)}
                            </td>

                            {/* Status Cell */}
                            <td className="px-4 py-4 bg-white border-y border-hana-border/30 transition-all duration-150">
                              <span
                                className={clsx(
                                  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide border',
                                  w.is_read
                                    ? 'bg-emerald-50 border-emerald-100/50 text-emerald-600'
                                    : 'bg-rose-50 border-rose-100/50 text-rose-600'
                                )}
                              >
                                {!w.is_read && <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse shrink-0" />}
                                {w.is_read ? 'Dibaca' : 'Belum Dibaca'}
                              </span>
                            </td>

                            {/* Aksi Cell */}
                            <td className="pr-6 pl-4 py-4 bg-white border-y border-r border-hana-border/30 rounded-r-2xl text-center transition-all duration-150">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailWarning(w);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-hana-border text-xs font-semibold text-text-secondary hover:bg-elevated hover:text-ink transition-colors"
                              >
                                <Eye size={12} />
                                <span>Detail</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={warningPage}
                totalPages={warningTotalPages}
                onPageChange={setWarningPage}
                totalItems={filteredWarnings.length}
                itemsPerPage={warningPerPage}
              />
            </div>
          )}
        </div>
      )}

      <WarningModal open={showWarning} onClose={() => setShowWarning(false)} users={candidateUsers} onSent={load} />
      <ActivityDetailModal
        user={detailUser}
        date={detailDate}
        open={Boolean(detailUser)}
        onClose={() => {
          setDetailUser(null);
          setDetailDate(null);
        }}
      />
      <WarningDetailModal
        warning={detailWarning}
        target={rows.find((r) => r.user.id === detailWarning?.to_id)?.user}
        open={Boolean(detailWarning)}
        onClose={() => setDetailWarning(null)}
      />
      <Modal
        open={showHeatmap}
        onClose={() => setShowHeatmap(false)}
        title="Heatmap Tim — 10 Hari Terakhir"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          <p className="text-xs text-text-muted">
            Memantau perkembangan skor harian anggota tim regional dalam 10 hari terakhir. Klik pada sel untuk melihat rincian aktivitas hari tersebut.
          </p>
          <div className="border border-hana-border/50 bg-elevated/20 p-5 rounded-2xl">
            <TeamHeatmap
              rows={heatRows}
              onCellClick={(u, date) => {
                setDetailUser(u);
                setDetailDate(date);
              }}
            />
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
