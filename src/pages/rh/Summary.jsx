import { useEffect, useState } from 'react';
import { Bot, AlertTriangle, Trophy, Flag, FileDown, Presentation, Loader2, CalendarRange } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getRHSession } from '../../lib/rhSession';
import Layout from '../../components/Layout';
import ScoreBadge from '../../components/ScoreBadge';
import WarningModal from './WarningModal';
import { PerformancePill } from '../../components/summary';
import { FullSpinner, ErrorBox, Spinner } from '../../components/ui';
import { fetchAllUsers, fetchScore, fetchSummaryFor, fetchDailyActivity, logActivity } from '../../lib/db';
import { summarizeForRh } from '../../lib/ai';
import { exportUserDetailPDFRange, exportOverallPPT, buildTeamStats, lowPerformerIds } from '../../lib/reports';
import { todayISO, formatDateID, clsx } from '../../lib/utils';

const URGENCY_COLOR = { high: '#EF4444', medium: '#F97316', low: '#3B82F6' };

// Format date ke YYYY-MM-DD pakai local time (bukan UTC) agar tidak timezone-shift
function localDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Semua tanggal (termasuk akhir pekan) dalam range
function getDatesInRange(from, to) {
  const dates = [];
  const cur = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  while (cur <= end) {
    dates.push(localDateStr(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// Hanya hari kerja (Senin–Jumat)
function getWeekdaysInRange(from, to) {
  return getDatesInRange(from, to).filter((d) => {
    const day = new Date(d + 'T00:00:00').getDay();
    return day !== 0 && day !== 6;
  });
}


export default function RHSummary() {
  const { user: authUser } = useAuth();
  const user = authUser || getRHSession();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [result, setResult] = useState(null);
  const [teamScored, setTeamScored] = useState([]);
  const [dateFrom, setDateFrom] = useState(todayISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [exportingId, setExportingId] = useState(null);
  const [pptBusy, setPptBusy] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [preselect, setPreselect] = useState([]);
  const ROLES = ['BM', 'FWSS', 'FA'];
  const [selectedRoles, setSelectedRoles] = useState(['BM', 'FWSS', 'FA']);

  function toggleRole(role) {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  useEffect(() => {
    (async () => {
      try {
        const all = await fetchAllUsers();
        setUsers(all.filter((u) => u.role !== 'RH'));
      } catch (e) {
        setError(e.message || 'Gagal memuat user.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Reset result saat range berubah
  useEffect(() => {
    setResult(null);
  }, [dateFrom, dateTo]);

  async function handleGenerate() {
    if (selectedRoles.length === 0) {
      setError('Pilih minimal satu role untuk di-generate.');
      return;
    }
    const weekdays = getWeekdaysInRange(dateFrom, dateTo);
    if (weekdays.length === 0) {
      setError('Tidak ada hari kerja (Senin–Jumat) dalam range yang dipilih.');
      return;
    }

    setGenerating(true);
    setError('');
    try {
      const team = selectedRoles.length === ROLES.length
        ? users
        : users.filter((u) => selectedRoles.includes(u.role));
      // Ambil skor per user per hari, lalu rata-ratakan
      const scored = await Promise.all(
        team.map(async (u) => {
          const dayScores = await Promise.all(weekdays.map((d) => fetchScore(u.id, d)));
          const valid = dayScores.filter((s) => s && s.daily_average != null);
          const avg = valid.length
            ? valid.reduce((sum, s) => sum + Number(s.daily_average), 0) / valid.length
            : null;
          const combinedSummary = valid.map((s) => s.summary).filter(Boolean).join(' | ') || null;
          return {
            user_id: u.id,
            name: u.name,
            role: u.role,
            branch: u.branch,
            daily_average: avg != null ? Number(avg.toFixed(2)) : null,
            daily_level: avg != null ? null : null, // dihitung di buildTeamStats
            summary: combinedSummary,
            scored_days: valid.length,
            total_days: weekdays.length,
          };
        })
      );
      setTeamScored(scored);

      const bm = team.find((u) => u.role === 'BM');
      let bmSummary = null;
      if (bm) {
        const row = await fetchSummaryFor({
          supervisorId: bm.id,
          targetUserId: team.find((u) => u.role === 'FWSS')?.id,
          date: dateTo,
        });
        bmSummary = row?.summary_data || null;
      }

      const stats = buildTeamStats(scored);
      const res = await summarizeForRh({
        allData: {
          team: scored,
          ranking: stats.ranking,
          stats,
          bm_summary: bmSummary,
          date_range: `${formatDateID(dateFrom)} – ${formatDateID(dateTo)}`,
        },
      });

      res.performance_ranking = stats.ranking;
      const validIds = new Set(scored.map((u) => u.user_id));
      const warnSet = new Set(lowPerformerIds(scored));
      res.requires_warning_letter = (res.requires_warning_letter || []).filter((id) => warnSet.has(id));
      res.risk_flags = (res.risk_flags || []).filter(
        (r) => validIds.has(r.user_id) || scored.some((u) => u.name === r.name)
      );
      setResult(res);
      logActivity({ userId: user?.id, role: user?.role, action: 'rh_summary_generated', metadata: { roles: selectedRoles, date_from: dateFrom, date_to: dateTo } });
    } catch (e) {
      setError(e.message || 'Gagal generate summary.');
    } finally {
      setGenerating(false);
    }
  }

  function openWarningFor(ids) {
    setPreselect(ids);
    setShowWarning(true);
  }

  async function handleExportPdf(u) {
    setExportingId(u.id);
    setError('');
    try {
      const dates = getDatesInRange(dateFrom, dateTo);
      const [activitiesArr, scoresArr] = await Promise.all([
        Promise.all(dates.map((d) => fetchDailyActivity(u.id, d))),
        Promise.all(dates.map((d) => fetchScore(u.id, d))),
      ]);
      const activitiesMap = Object.fromEntries(dates.map((d, i) => [d, activitiesArr[i]]));
      const scoresMap = Object.fromEntries(dates.map((d, i) => [d, scoresArr[i]]));
      await exportUserDetailPDFRange({ user: u, dates, activitiesMap, scoresMap });
    } catch (e) {
      setError(e.message || 'Gagal mengekspor PDF.');
    } finally {
      setExportingId(null);
    }
  }

  async function handleExportPpt() {
    setPptBusy(true);
    setError('');
    try {
      await exportOverallPPT({
        rhName: user.name,
        dateFrom,
        dateTo,
        team: teamScored,
        result,
      });
    } catch (e) {
      setError(e.message || 'Gagal membuat laporan PPT.');
    } finally {
      setPptBusy(false);
    }
  }

  const dateRangeLabel =
    dateFrom === dateTo
      ? formatDateID(dateFrom)
      : `${formatDateID(dateFrom)} – ${formatDateID(dateTo)}`;

  return (
    <Layout title="Summary Keseluruhan" back="/dashboard/rh">
      {loading ? (
        <FullSpinner label="Memuat data..." />
      ) : (
        <div className="space-y-4">
          {error && <ErrorBox>{error}</ErrorBox>}

          {/* Pemilih range tanggal */}
          <div className="card">
            <p className="flex items-center gap-1.5 text-sm font-semibold mb-3">
              <CalendarRange size={16} className="text-hana-teal-700" /> Range Tanggal Laporan
            </p>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="label">Dari</label>
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="label">Sampai</label>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-2 text-sm"
                />
              </div>
              <p className="text-xs text-text-muted pb-2">{dateRangeLabel}</p>
            </div>
          </div>

          {/* Export detail per user (PDF) */}
          <div className="card">
            <p className="flex items-center gap-1.5 text-sm font-semibold mb-1">
              <FileDown size={16} className="text-hana-teal-700" /> Export Detail per User (PDF)
            </p>
            <p className="text-[11px] text-text-muted mb-3">
              Mengekspor aktivitas harian semua hari dalam range, termasuk Sabtu/Minggu jika ada data.
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-lg border border-hana-border px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{u.name}</p>
                    <p className="text-[10px] text-text-muted">{u.role}{u.branch ? ' · ' + u.branch : ''}</p>
                  </div>
                  <button
                    onClick={() => handleExportPdf(u)}
                    disabled={exportingId === u.id}
                    className="btn-ghost !py-1.5 !px-3 text-xs shrink-0"
                  >
                    {exportingId === u.id ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />} PDF
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Generate Laporan Keseluruhan */}
          {!result && (
            <div className="card text-center py-8">
              <Bot size={36} className="text-hana-teal-700 mx-auto mb-3" />
              <p className="text-sm text-text-secondary mb-1">
                Generate executive summary kinerja seluruh tim regional.
              </p>
              <p className="text-xs text-text-muted mb-4">
                Hanya hari kerja (Senin–Jumat) yang diproses. Sabtu/Minggu dalam range otomatis dikecualikan.
              </p>
              <div className="flex items-center gap-4 justify-center mb-4">
                <p className="text-xs text-text-muted">Sertakan role:</p>
                {ROLES.map((r) => (
                  <label key={r} className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(r)}
                      onChange={() => toggleRole(r)}
                      className="accent-hana-teal-700 w-4 h-4"
                    />
                    {r}
                  </label>
                ))}
              </div>
              <button onClick={handleGenerate} disabled={generating} className="btn-teal mx-auto">
                {generating ? <Spinner size={18} className="text-white" /> : <Bot size={18} />}
                {generating ? 'Menyusun executive brief...' : 'Generate Summary Keseluruhan'}
              </button>
            </div>
          )}

          {result && (
            <>
              <div className="flex justify-end gap-2">
                <button onClick={handleExportPpt} disabled={pptBusy} className="btn-teal !py-2 text-xs">
                  {pptBusy ? <Spinner size={14} className="text-white" /> : <Presentation size={14} />} Generate Laporan PPT
                </button>
                <button onClick={handleGenerate} disabled={generating} className="btn-ghost !py-2 text-xs">
                  {generating ? <Spinner size={14} /> : <Bot size={14} />} Regenerate
                </button>
              </div>

              {/* Executive summary */}
              <div className="card border-hana-teal-700/40 bg-hana-teal-50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-hana-teal-700">Executive Summary</p>
                  <PerformancePill status={result.team_overall_status} />
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">{result.executive_summary}</p>
              </div>

              {/* Ranking */}
              {result.performance_ranking?.length > 0 && (
                <div className="card">
                  <p className="flex items-center gap-1.5 text-sm font-semibold mb-3">
                    <Trophy size={16} className="text-hana-teal-700" /> Ranking Performa
                  </p>
                  <div className="space-y-2">
                    {result.performance_ranking.map((r) => (
                      <div key={r.user_id || r.rank} className="flex items-center gap-3">
                        <span className="font-display font-bold text-text-muted w-5">{r.rank}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{r.name}</p>
                          <p className="text-[10px] text-text-muted">{r.role}</p>
                        </div>
                        <span className="font-display font-bold">{r.score != null ? Number(r.score).toFixed(1) : '—'}</span>
                        <ScoreBadge level={r.level} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk flags */}
              {result.risk_flags?.length > 0 && (
                <div className="card border-score-1/30">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-score-1 mb-3">
                    <Flag size={16} /> Risk Flags
                  </p>
                  <div className="space-y-2">
                    {result.risk_flags.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase shrink-0"
                          style={{ backgroundColor: `${URGENCY_COLOR[r.urgency] || '#52616B'}26`, color: URGENCY_COLOR[r.urgency] || '#52616B' }}
                        >
                          {r.urgency}
                        </span>
                        <p className="text-text-secondary"><b className="text-ink">{r.name}:</b> {r.issue}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rekomendasi strategis */}
              {result.strategic_recommendations?.length > 0 && (
                <div className="card">
                  <p className="text-sm font-semibold mb-2 text-hana-teal-700">Rekomendasi Strategis</p>
                  <ul className="space-y-1.5">
                    {result.strategic_recommendations.map((s, i) => (
                      <li key={i} className="text-xs text-text-secondary flex gap-2">
                        <span className="text-hana-teal-700">•</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Surat peringatan */}
              <div className="card">
                {result.requires_warning_letter?.length > 0 ? (
                  <>
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-score-1 mb-1">
                      <AlertTriangle size={16} /> Disarankan Surat Peringatan
                    </p>
                    <p className="text-xs text-text-muted mb-3">
                      {result.requires_warning_letter
                        .map((id) => users.find((u) => u.id === id)?.name || id)
                        .join(', ')}
                    </p>
                    <button onClick={() => openWarningFor(result.requires_warning_letter)} className="btn-pink w-full">
                      <AlertTriangle size={16} /> Kirim Peringatan ke yang Disarankan
                    </button>
                  </>
                ) : (
                  <button onClick={() => openWarningFor([])} className="btn-pink w-full">
                    <AlertTriangle size={16} /> Kirim Surat Peringatan
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <WarningModal
        key={preselect.join(',')}
        open={showWarning}
        onClose={() => setShowWarning(false)}
        users={users}
        preselect={preselect}
      />
    </Layout>
  );
}
