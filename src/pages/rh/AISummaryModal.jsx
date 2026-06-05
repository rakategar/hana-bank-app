import { useState } from 'react';
import { Bot, Trophy, Flag, Check, AlertTriangle, Presentation, Loader2 } from 'lucide-react';
import { Modal, Avatar, Spinner } from '../../components/ui';
import ScoreBadge from '../../components/ScoreBadge';
import { PerformancePill } from '../../components/summary';
import WarningModal from './WarningModal';
import { formatDateID, clsx } from '../../lib/utils';

export default function AISummaryModal({
  open,
  onClose,
  result,
  date,
  users,
  teamScored,
  onExportPpt,
  pptBusy
}) {
  const [showWarning, setShowWarning] = useState(false);
  const [preselect, setPreselect] = useState([]);

  if (!result) return null;

  function openWarningFor(ids) {
    setPreselect(ids);
    setShowWarning(true);
  }

  return (
    <Modal open={open} onClose={onClose} title="Hasil AI Summary Keseluruhan" maxWidth="max-w-4xl">
      <div className="space-y-5">
        
        {/* Export PPT Bar */}
        <div className="flex items-center justify-between bg-slate-50 border border-hana-border/50 p-4 rounded-2xl">
          <div>
            <p className="text-xs font-semibold text-text-muted">Laporan Presentasi</p>
            <p className="text-sm font-bold text-ink leading-tight">Tanggal: {formatDateID(date)}</p>
          </div>
          <button onClick={onExportPpt} disabled={pptBusy} className="btn-teal !py-2 text-xs">
            {pptBusy ? <Spinner size={14} className="text-white animate-spin" /> : <Presentation size={14} />}
            <span>Export Laporan PPT</span>
          </button>
        </div>

        {/* Executive Summary */}
        <div className="card bg-hana-teal-50/50">
          <div className="flex items-center justify-between mb-3 border-b border-hana-teal-100/60 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-hana-teal-100 text-hana-teal-600">
                <Bot size={16} />
              </div>
              <p className="text-sm font-bold text-hana-teal-700">Analisis Executive Brief</p>
            </div>
            <PerformancePill status={result.team_overall_status} />
          </div>
          <p className="text-sm text-text-secondary leading-relaxed font-medium">
            {result.executive_summary}
          </p>
        </div>

        {/* Ranking */}
        {result.performance_ranking?.length > 0 && (
          <div className="card">
            <div className="border-b border-hana-border pb-3 mb-4">
              <p className="flex items-center gap-2 text-sm font-bold text-ink font-display">
                <Trophy size={18} className="text-hana-teal-600" /> Ranking Performa Hari Ini
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                Urutan peringkat berdasarkan rata-rata nilai aktivitas harian.
              </p>
            </div>
            <div className="divide-y divide-hana-border/30">
              {result.performance_ranking.map((r, index) => {
                const rank = index + 1;
                const isTop3 = rank <= 3;
                const medalColors = {
                  1: 'bg-amber-100 border-amber-200 text-amber-700', // Gold
                  2: 'bg-slate-100 border-slate-200 text-slate-600',  // Silver
                  3: 'bg-amber-50 border-amber-100 text-amber-800'   // Bronze
                };
                return (
                  <div key={r.user_id || r.rank} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                    {isTop3 ? (
                      <span className={clsx('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-extrabold', medalColors[rank])}>
                        {rank}
                      </span>
                    ) : (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center text-xs font-bold text-text-muted">
                        {rank}
                      </span>
                    )}
                    <Avatar name={r.name} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-ink truncate">{r.name}</p>
                      <p className="text-[10px] text-text-muted font-semibold uppercase">{r.role}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-display text-sm font-extrabold text-ink">
                        {r.score != null ? Number(r.score).toFixed(1) : '—'}
                      </span>
                      <span className="text-[10px] text-text-muted block">Skor</span>
                    </div>
                    <div className="w-24 flex justify-end">
                      <ScoreBadge level={r.level} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Risk flags */}
        {result.risk_flags?.length > 0 && (
          <div className="card bg-rose-50/10">
            <div className="border-b border-hana-border/30 pb-3 mb-4">
              <p className="flex items-center gap-2 text-sm font-bold text-score-1">
                <Flag size={18} /> Peringatan Risiko Kritis (Risk Flags)
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                Identifikasi masalah operasional dan indikasi penurunan kinerja tim.
              </p>
            </div>
            <div className="space-y-3">
              {result.risk_flags.map((r, i) => (
                <div key={i} className="flex items-start gap-3 border border-hana-border/30 bg-white p-3 rounded-xl hover:shadow-sm transition-all">
                  <span className={clsx(
                    'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider shrink-0 border',
                    r.urgency === 'high' ? 'bg-rose-50 border-rose-100 text-rose-600' :
                    r.urgency === 'medium' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                    'bg-blue-50 border-blue-100 text-blue-600'
                  )}>
                    {r.urgency}
                  </span>
                  <div className="text-xs text-text-secondary leading-relaxed">
                    <span className="font-bold text-ink">{r.name}</span>
                    <span className="mx-1.5 text-text-muted">•</span>
                    <span>{r.issue}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strategic recommendations */}
        {result.strategic_recommendations?.length > 0 && (
          <div className="card">
            <div className="border-b border-hana-border pb-3 mb-4">
              <p className="text-sm font-bold text-hana-teal-700">Rekomendasi Strategis AI</p>
              <p className="text-xs text-text-muted mt-0.5">
                Langkah operasional yang disarankan oleh sistem untuk regional.
              </p>
            </div>
            <div className="space-y-3">
              {result.strategic_recommendations.map((s, i) => (
                <div key={i} className="flex items-start gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-hana-teal-50 text-hana-teal-600">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed font-medium">{s}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warning recommendation box */}
        <div className="card">
          {result.requires_warning_letter?.length > 0 ? (
            <>
              <p className="flex items-center gap-1.5 text-sm font-bold text-score-1 mb-1">
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

      </div>

      <WarningModal
        key={preselect.join(',')}
        open={showWarning}
        onClose={() => setShowWarning(false)}
        users={users}
        preselect={preselect}
      />
    </Modal>
  );
}
