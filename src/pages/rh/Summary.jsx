import { useEffect, useState } from 'react';
import { Bot, AlertTriangle, Trophy, Flag, FileDown, Presentation, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/Layout';
import ScoreBadge from '../../components/ScoreBadge';
import WarningModal from './WarningModal';
import { PerformancePill } from '../../components/summary';
import { FullSpinner, ErrorBox, Spinner } from '../../components/ui';
import { fetchAllUsers, fetchScore, fetchSummaryFor, fetchDailyActivity } from '../../lib/db';
import { summarizeForRh } from '../../lib/ai';
import { exportUserDetailPDF, exportOverallPPT, buildTeamStats, lowPerformerIds } from '../../lib/reports';
import { todayISO, formatDateID, clsx } from '../../lib/utils';

const URGENCY_COLOR = { high: '#EF4444', medium: '#F97316', low: '#3B82F6' };

export default function RHSummary() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [result, setResult] = useState(null);
  const [teamScored, setTeamScored] = useState([]);
  const [date, setDate] = useState(todayISO());
  const [exportingId, setExportingId] = useState(null);
  const [pptBusy, setPptBusy] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [preselect, setPreselect] = useState([]);

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

  async function handleGenerate() {
    setGenerating(true);
    setError('');
    try {
      const team = users;
      const scored = await Promise.all(
        team.map(async (u) => {
          const s = await fetchScore(u.id, date);
          return {
            user_id: u.id,
            name: u.name,
            role: u.role,
            branch: u.branch,
            daily_average: s?.daily_average ?? null,
            daily_level: s?.daily_level ?? null,
            summary: s?.summary ?? null,
          };
        })
      );
      setTeamScored(scored);
      // sertakan summary BM jika ada
      const bm = team.find((u) => u.role === 'BM');
      let bmSummary = null;
      if (bm) {
        const row = await fetchSummaryFor({ supervisorId: bm.id, targetUserId: team.find((u) => u.role === 'FWSS')?.id, date });
        bmSummary = row?.summary_data || null;
      }

      // Statistik deterministik = sumber kebenaran (kirim sbg fakta ke AI).
      const stats = buildTeamStats(scored);
      const res = await summarizeForRh({ allData: { team: scored, ranking: stats.ranking, stats, bm_summary: bmSummary } });

      // Timpa/saring output AI agar PERSIS sesuai data nyata.
      res.performance_ranking = stats.ranking;
      const validIds = new Set(scored.map((u) => u.user_id));
      const warnSet = new Set(lowPerformerIds(scored));
      res.requires_warning_letter = (res.requires_warning_letter || []).filter((id) => warnSet.has(id));
      res.risk_flags = (res.risk_flags || []).filter((r) => validIds.has(r.user_id) || scored.some((u) => u.name === r.name));
      setResult(res);
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
      const [activity, score] = await Promise.all([
        fetchDailyActivity(u.id, date),
        fetchScore(u.id, date),
      ]);
      await exportUserDetailPDF({ user: u, date, activity, score });
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
      await exportOverallPPT({ rhName: user.name, date, team: teamScored, result });
    } catch (e) {
      setError(e.message || 'Gagal membuat laporan PPT.');
    } finally {
      setPptBusy(false);
    }
  }

  return (
    <Layout title="Summary Keseluruhan" back="/dashboard/rh">
      {loading ? (
        <FullSpinner label="Memuat data..." />
      ) : (
        <div className="space-y-4">
          {error && <ErrorBox>{error}</ErrorBox>}

          {/* Pemilih tanggal laporan */}
          <div className="card flex flex-wrap items-end justify-between gap-3">
            <div>
              <label className="label">Tanggal Laporan</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-3 py-2 text-sm"
              />
              <p className="text-[11px] text-text-muted mt-1">{formatDateID(date)}</p>
            </div>
          </div>

          {/* Export detail per user (PDF) */}
          <div className="card">
            <p className="flex items-center gap-1.5 text-sm font-semibold mb-3">
              <FileDown size={16} className="text-hana-teal-700" /> Export Detail per User (PDF)
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

          {!result && (
            <div className="card text-center py-8">
              <Bot size={36} className="text-hana-teal-700 mx-auto mb-3" />
              <p className="text-sm text-text-secondary mb-4">
                Generate executive summary kinerja seluruh tim regional hari ini.
              </p>
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
                  <p className="flex items-center gap-1.5 text-sm font-semibold mb-3"><Trophy size={16} className="text-hana-teal-700" /> Ranking Performa</p>
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
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-score-1 mb-3"><Flag size={16} /> Risk Flags</p>
                  <div className="space-y-2">
                    {result.risk_flags.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase shrink-0" style={{ backgroundColor: `${URGENCY_COLOR[r.urgency] || '#52616B'}26`, color: URGENCY_COLOR[r.urgency] || '#52616B' }}>
                          {r.urgency}
                        </span>
                        <p className="text-text-secondary"><b className="text-ink">{r.name}:</b> {r.issue}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Strategic recommendations */}
              {result.strategic_recommendations?.length > 0 && (
                <div className="card">
                  <p className="text-sm font-semibold mb-2 text-hana-teal-700">Rekomendasi Strategis</p>
                  <ul className="space-y-1.5">
                    {result.strategic_recommendations.map((s, i) => (
                      <li key={i} className="text-xs text-text-secondary flex gap-2"><span className="text-hana-teal-700">•</span>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warning suggestion */}
              <div className="card">
                {result.requires_warning_letter?.length > 0 ? (
                  <>
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-score-1 mb-1"><AlertTriangle size={16} /> Disarankan Surat Peringatan</p>
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
