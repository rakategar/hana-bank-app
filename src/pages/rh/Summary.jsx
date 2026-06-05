import { useEffect, useState } from 'react';
import { Bot, AlertTriangle, FileDown, Loader2, Search, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/Layout';
import WarningModal from './WarningModal';
import AISummaryModal from './AISummaryModal';
import { Avatar, SummarySkeleton, Select, Pagination, DatePickerCard, Modal } from '../../components/ui';
import { fetchAllUsers, fetchScore, fetchSummaryFor, fetchDailyActivity } from '../../lib/db';
import { summarizeForRh } from '../../lib/gemini';
import { exportUserDetailPDF, exportOverallPPT, buildTeamStats, lowPerformerIds } from '../../lib/reports';
import { todayISO, formatDateID, clsx } from '../../lib/utils';

const ROLE_OPTIONS = [
  { value: 'ALL', label: 'Semua Jabatan' },
  { value: 'BM', label: 'Branch Manager' },
  { value: 'FWSS', label: 'FW Sales Supervisor' },
  { value: 'FA', label: 'Financial Advisor' },
];

export default function RHSummary() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [users, setUsers] = useState([]);
  const [result, setResult] = useState(null);
  const [teamScored, setTeamScored] = useState([]);
  const [date, setDate] = useState(todayISO());
  const [exportingId, setExportingId] = useState(null);
  const [pptBusy, setPptBusy] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [preselect, setPreselect] = useState([]);

  // Search, Filter, Pagination states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal control
  const [showAIModal, setShowAIModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter]);

  useEffect(() => {
    (async () => {
      try {
        const all = await fetchAllUsers();
        setUsers(all.filter((u) => u.role !== 'RH'));
      } catch (e) {
        toast.error(e.message || 'Gagal memuat user.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleGenerate() {
    setGenerating(true);
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

      const bm = team.find((u) => u.role === 'BM');
      let bmSummary = null;
      if (bm) {
        const row = await fetchSummaryFor({ supervisorId: bm.id, targetUserId: team.find((u) => u.role === 'FWSS')?.id, date });
        bmSummary = row?.summary_data || null;
      }

      const stats = buildTeamStats(scored);
      const res = await summarizeForRh({ allData: { team: scored, ranking: stats.ranking, stats, bm_summary: bmSummary } });

      res.performance_ranking = stats.ranking;
      const validIds = new Set(scored.map((u) => u.user_id));
      const warnSet = new Set(lowPerformerIds(scored));
      res.requires_warning_letter = (res.requires_warning_letter || []).filter((id) => warnSet.has(id));
      res.risk_flags = (res.risk_flags || []).filter((r) => validIds.has(r.user_id) || scored.some((u) => u.name === r.name));
      
      setResult(res);
      setShowGenerateModal(false);
      setShowAIModal(true); // Open modal directly upon generation
      toast.success('AI Summary berhasil dibuat!');
    } catch (e) {
      setShowGenerateModal(false);
      toast.error(e.message || 'Gagal generate summary.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleExportPdf(u) {
    setExportingId(u.id);
    try {
      const [activity, score] = await Promise.all([
        fetchDailyActivity(u.id, date),
        fetchScore(u.id, date),
      ]);
      await exportUserDetailPDF({ user: u, date, activity, score });
      toast.success(`PDF ${u.name} berhasil diunduh.`);
    } catch (e) {
      toast.error(e.message || 'Gagal mengekspor PDF.');
    } finally {
      setExportingId(null);
    }
  }

  async function handleExportPpt() {
    setPptBusy(true);
    try {
      await exportOverallPPT({ rhName: user.name, date, team: teamScored, result });
      toast.success('Laporan PPT berhasil diunduh.');
    } catch (e) {
      toast.error(e.message || 'Gagal membuat laporan PPT.');
    } finally {
      setPptBusy(false);
    }
  }

  // Filter & Pagination computations
  const filteredUsers = users.filter((u) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = u.name?.toLowerCase().includes(q);
      const branchMatch = u.branch?.toLowerCase().includes(q);
      if (!nameMatch && !branchMatch) return false;
    }
    if (roleFilter !== 'ALL' && u.role !== roleFilter) {
      return false;
    }
    return true;
  });

  const itemsPerPage = 5;
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) {
    return (
      <Layout title="Summary Keseluruhan" >
        <SummarySkeleton usersCount={6} />
      </Layout>
    );
  }
  return (
    <Layout title="Summary Keseluruhan" >
      <div className="space-y-5">
        
        <DatePickerCard date={date} onChange={setDate} label="Tanggal Summary" />

        {/* AI Generator Panel */}
        <div className="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-hana-teal-50 border border-hana-teal-100/50 text-hana-teal-600 shadow-sm shrink-0">
              <Bot size={24} className={clsx(generating && "animate-pulse")} />
            </div>
            <div>
              <p className="font-display text-sm font-extrabold text-ink">Laporan Eksekutif Regional (AI)</p>
              <p className="text-xs text-text-muted mt-0.5">Analisis executive summary, ranking kinerja, dan peringatan risiko menggunakan Google Gemini.</p>
            </div>
          </div>
          <button
            onClick={() => setShowGenerateModal(true)}
            disabled={generating}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-hana-teal-200 bg-hana-teal-50 px-4 text-xs font-bold text-hana-teal-700 transition-colors hover:bg-hana-teal-100/30 hover:border-hana-teal-300 shrink-0"
          >
            {generating ? <Loader2 size={14} className="animate-spin text-hana-teal-700 animate-pulse" /> : <Bot size={14} />}
            <span>{generating ? 'Menganalisis...' : result ? 'Lihat / Regenerate Laporan' : 'Generate Summary'}</span>
          </button>
        </div>

        {/* Export detail per user (PDF) */}
        <div className="card !p-0 overflow-hidden">
          <div className="border-b border-hana-border px-4 py-4 sm:px-6">
            <div>
              <p className="font-display text-lg font-extrabold text-ink">Export Laporan Harian Tim (PDF)</p>
              <p className="text-xs text-text-muted mt-0.5">Unduh berkas PDF laporan rinci aktivitas harian masing-masing anggota tim.</p>
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
                  className="w-48"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto px-4 sm:px-6 py-2">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-text-muted border-b border-hana-border/30">
                  <th className="py-2.5 font-semibold">Nama</th>
                  <th className="pr-4 pl-4 py-2.5 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hana-border/30">
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-8 text-center text-text-muted font-medium">
                      Tidak ada anggota tim ditemukan.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} />
                          <div className="min-w-0">
                            <p className="font-bold leading-snug text-ink truncate">{u.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="inline-flex items-center rounded bg-slate-50 border border-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-text-secondary uppercase">
                                {u.role}
                              </span>
                              <span className="text-[8px] text-text-muted/50">&bull;</span>
                              <span className="text-[10px] text-text-secondary/70">
                                {u.branch}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="pr-4 pl-4 py-3.5 text-right">
                        <button
                          onClick={() => handleExportPdf(u)}
                          disabled={exportingId === u.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-hana-border text-xs font-semibold text-text-secondary hover:bg-elevated hover:text-ink transition-colors"
                        >
                          {exportingId === u.id ? <Loader2 size={12} className="animate-spin text-hana-teal-600" /> : <FileDown size={12} />}
                          <span>PDF</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredUsers.length}
            itemsPerPage={itemsPerPage}
          />
        </div>

      </div>

      {/* Generate AI Laporan Modal */}
      <Modal
        open={showGenerateModal}
        onClose={() => !generating && setShowGenerateModal(false)}
        title="Laporan Eksekutif AI"
        maxWidth="max-w-md"
      >
        {generating ? (
          <div className="text-center py-10 flex flex-col items-center">
            <Loader2 size={40} className="animate-spin text-hana-teal-600 mb-4 animate-pulse" />
            <p className="font-display text-base font-bold text-ink">Menganalisis Laporan Tim...</p>
            <p className="text-xs text-text-secondary mt-2 max-w-sm leading-relaxed">
              Google Gemini sedang memproses data aktivitas harian, menghitung ranking performa, dan mendeteksi peringatan risiko kritis tim Anda.
            </p>
          </div>
        ) : (
          <div className="text-center py-6 flex flex-col items-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-hana-teal-50 text-hana-teal-600 mb-4 shadow-sm border border-hana-teal-100/50">
              <Bot size={32} />
            </div>
            <p className="font-display text-lg font-extrabold text-ink mb-2">
              Generate Laporan Eksekutif Regional
            </p>
            <p className="text-xs text-text-secondary max-w-sm mb-6 leading-relaxed">
              Gunakan AI Studio (Google Gemini) untuk menganalisis dan menyusun Executive Summary, Ranking Kinerja, dan Peringatan Risiko tim regional Anda secara real-time untuk tanggal <strong>{formatDateID(date)}</strong>.
            </p>

            {result ? (
              <div className="space-y-3 w-full">
                <div className="p-3 bg-hana-teal-50/50 border border-hana-teal-100/50 rounded-xl text-xs text-hana-teal-800 font-semibold mb-3">
                  ✓ Laporan tanggal ini sudah berhasil dibuat.
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <button
                    onClick={() => {
                      setShowGenerateModal(false);
                      setShowAIModal(true);
                    }}
                    className="btn-teal w-full !min-h-11 shadow-sm"
                  >
                    <Bot size={16} />
                    <span>Lihat Hasil AI Summary</span>
                  </button>
                  <button
                    onClick={() => {
                      handleGenerate();
                    }}
                    className="btn-ghost w-full !min-h-11 border border-hana-border"
                  >
                    <span>Regenerate (Buat Ulang)</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  handleGenerate();
                }}
                className="btn-teal w-full !min-h-11 shadow-sm"
              >
                <Bot size={16} />
                <span>Generate Summary Keseluruhan</span>
              </button>
            )}
          </div>
        )}
      </Modal>

      {/* AI Summary Modal Popup */}
      <AISummaryModal
        open={showAIModal}
        onClose={() => setShowAIModal(false)}
        result={result}
        date={date}
        users={users}
        teamScored={teamScored}
        onExportPpt={handleExportPpt}
        pptBusy={pptBusy}
      />
    </Layout>
  );
}
