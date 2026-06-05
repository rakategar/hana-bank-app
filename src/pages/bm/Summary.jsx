import { useEffect, useState } from 'react';
import { Bot, Save, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/Layout';
import { ErrorBox, Spinner, SummarySkeleton } from '../../components/ui';
import { PersonSummaryCard, ActionPlanEditor } from '../../components/summary';
import {
  fetchSubordinates,
  fetchScore,
  fetchSummaryFor,
  upsertSummary,
} from '../../lib/db';
import { summarizeForBm } from '../../lib/gemini';
import { todayISO, statusFromLevel } from '../../lib/utils';

const SHOW_TEMP_BM_SUMMARY = false;

const ACTION_TEMPLATES = (names) => [
  ...names.map((n) => `Coaching FWSS ${n}`),
  'Support high-potential customer case',
  'Joint meeting dengan tim',
  'Eskalasi ke RH',
];

function buildTemporaryBmSummary(fwssList) {
  const statuses = ['ON TRACK', 'RECOVERY', 'HIGH IMPACT', 'CRITICAL'];
  const summaries = fwssList.map((fwss, index) => {
    const status = statuses[index % statuses.length];
    return {
      fwss_id: fwss.id,
      fwss_name: fwss.name,
      performance_status: status,
      summary:
        status === 'HIGH IMPACT'
          ? `${fwss.name} menunjukkan eksekusi tim yang kuat, disiplin follow-up baik, dan beberapa FA mulai stabil di aktivitas prioritas.`
          : status === 'ON TRACK'
            ? `${fwss.name} berada pada jalur yang cukup baik, namun masih perlu menjaga konsistensi coaching dan kontrol pipeline harian.`
            : status === 'RECOVERY'
              ? `${fwss.name} membutuhkan penguatan monitoring dan intervensi lebih cepat pada FA dengan aktivitas rendah.`
              : `${fwss.name} perlu perhatian segera karena disiplin input dan kualitas tindak lanjut tim belum cukup terlihat hari ini.`,
      highlights: [
        'Pipeline prioritas mulai terpetakan untuk tindak lanjut cabang.',
        'Koordinasi harian dengan FA berjalan dan dapat dipantau.',
      ],
      risks: [
        'Sebagian FA masih membutuhkan arahan lebih konkret pada slot closing.',
        'Dokumentasi hasil aktivitas belum konsisten di semua anggota tim.',
      ],
      bm_recommendations: [
        `Lakukan coaching singkat dengan ${fwss.name} pada fokus pipeline dan recovery action.`,
        'Prioritaskan joint meeting untuk customer dengan potensi konversi tinggi.',
        'Minta update CRM dan bukti aktivitas sebelum end day review.',
      ],
    };
  });

  return {
    team_overall:
      'Ringkasan sementara: performa tim cabang menunjukkan aktivitas yang mulai terstruktur, namun masih perlu penguatan pada disiplin input, kontrol pipeline, dan follow-up closing. BM disarankan memprioritaskan FWSS dengan status recovery/critical untuk coaching harian dan memastikan setiap action plan memiliki owner serta tenggat yang jelas.',
    urgent_actions: [
      'Validasi FWSS dengan aktivitas tim paling rendah sebelum end day review.',
      'Tetapkan joint meeting untuk pipeline high-potential yang belum bergerak.',
      'Pastikan setiap FWSS mengunci recovery action untuk FA yang belum mencapai target harian.',
    ],
    fwss_summaries: summaries,
    temporary: true,
  };
}

export default function BMSummary() {
  const { user } = useAuth();
  const [fwssList, setFwssList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [notes, setNotes] = useState({});
  const [actions, setActions] = useState({});
  const [savedFor, setSavedFor] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const subs = await fetchSubordinates(user.id);
        setFwssList(subs);
        const existing = await Promise.all(
          subs.map((f) => fetchSummaryFor({ supervisorId: user.id, targetUserId: f.id }))
        );
        const n = {}, a = {};
        let savedData = null;
        existing.forEach((row, i) => {
          if (row) {
            n[subs[i].id] = row.supervisor_notes || '';
            a[subs[i].id] = row.action_plans || [];
            if (row.summary_data) savedData = row.summary_data;
          }
        });
        setNotes(n);
        setActions(a);
        if (savedData) setAiResult(savedData);
        else if (SHOW_TEMP_BM_SUMMARY) setAiResult(buildTemporaryBmSummary(subs));
      } catch (e) {
        toast.error(e.message || 'Gagal memuat data.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user.id]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const fwssData = await Promise.all(
        fwssList.map(async (fwss) => {
          const [score, faSummaryRows, fas] = await Promise.all([
            fetchScore(fwss.id, todayISO()),
            // ringkasan yang dibuat FWSS untuk FA-nya
            fetchSummaryFor({ supervisorId: fwss.id, targetUserId: fwss.id }).catch(() => null),
            fetchSubordinates(fwss.id),
          ]);
          const faScores = await Promise.all(
            fas.map(async (fa) => {
              const s = await fetchScore(fa.id, todayISO());
              return { id: fa.id, name: fa.name, daily_average: s?.daily_average ?? null, daily_level: s?.daily_level ?? null };
            })
          );
          return {
            id: fwss.id,
            name: fwss.name,
            score: score ? { daily_average: score.daily_average, daily_level: score.daily_level } : null,
            faSummary: faSummaryRows?.summary_data || null,
            faScores,
          };
        })
      );
      const result = await summarizeForBm({ fwssData });
      // Audit: paksa performance_status sesuai daily_level nyata tiap FWSS.
      const levelById = Object.fromEntries(fwssData.map((f) => [f.id, f.score?.daily_level ?? null]));
      const nameById = Object.fromEntries(fwssData.map((f) => [f.id, f.name]));
      (result?.fwss_summaries || []).forEach((s) => {
        const id = s.fwss_id || Object.keys(nameById).find((k) => nameById[k] === s.fwss_name);
        if (id && id in levelById) s.performance_status = statusFromLevel(levelById[id]);
      });
      setAiResult(result);
    } catch (e) {
      toast.error(e.message || 'Gagal generate summary.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave(fwssId) {
    setSaving(true);
    try {
      const fwss = fwssList.find((x) => x.id === fwssId);
      const sum = aiResult?.fwss_summaries?.find((s) => s.fwss_id === fwssId || s.fwss_name === fwss?.name);
      await upsertSummary({
        supervisorId: user.id,
        targetUserId: fwssId,
        aiSummary: sum?.summary || null,
        summaryData: aiResult,
        supervisorNotes: notes[fwssId] || '',
        actionPlans: actions[fwssId] || [],
      });
      setSavedFor((s) => ({ ...s, [fwssId]: true }));
      setTimeout(() => setSavedFor((s) => ({ ...s, [fwssId]: false })), 2500);
    } catch (e) {
      toast.error(e.message || 'Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  }

  function matchSummary(fwss) {
    return aiResult?.fwss_summaries?.find((s) => s.fwss_id === fwss.id || s.fwss_name === fwss.name);
  }

  return (
    <Layout title="Summary Tim">
      {loading ? (
        <SummarySkeleton usersCount={fwssList.length || 2} />
      ) : (
        <div className="space-y-4">

          {!aiResult && (
            <div className="card text-center py-8">
              <Bot size={36} className="text-hana-teal-700 mx-auto mb-3" />
              <p className="text-sm text-text-secondary mb-4">
                Generate ringkasan kinerja {fwssList.length} FWSS beserta FA mereka.
              </p>
              <button onClick={handleGenerate} disabled={generating} className="btn-teal mx-auto">
                {generating ? <Spinner size={18} className="text-white" /> : <Bot size={18} />}
                {generating ? 'Menganalisis kinerja tim...' : 'Generate Summary Tim'}
              </button>
            </div>
          )}

          {aiResult && (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {aiResult.temporary ? (
                  <div className="rounded-2xl border border-score-2/25 bg-score-2/10 px-4 py-3 text-xs font-semibold text-score-2">
                    Preview sementara tanpa API key. Data ini hanya untuk melihat UI summary BM.
                  </div>
                ) : <span />}
                <button onClick={handleGenerate} disabled={generating} className="btn-ghost !py-2 text-xs">
                  {generating ? <Spinner size={14} /> : <Bot size={14} />} Regenerate
                </button>
              </div>

              {aiResult.team_overall && (
                <div className="card bg-hana-teal-500/5 border-hana-teal-500/30">
                  <p className="text-sm font-semibold text-hana-teal-700 mb-1">Ringkasan Tim Cabang</p>
                  <p className="text-sm text-text-secondary leading-relaxed">{aiResult.team_overall}</p>
                </div>
              )}

              {aiResult.urgent_actions?.length > 0 && (
                <div className="card border-score-1/40 bg-score-1/10">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-score-1 mb-2">
                    <AlertTriangle size={16} /> Tindakan Mendesak
                  </p>
                  <ul className="space-y-1">
                    {aiResult.urgent_actions.map((a, i) => (
                      <li key={i} className="text-xs text-text-secondary flex gap-2"><span className="text-score-1">•</span>{a}</li>
                    ))}
                  </ul>
                </div>
              )}

              {fwssList.map((fwss) => {
                const s = matchSummary(fwss);
                return (
                  <div key={fwss.id} className="space-y-3">
                    <PersonSummaryCard
                      name={fwss.name}
                      status={s?.performance_status}
                      summary={s?.summary}
                      highlights={s?.highlights}
                      risks={s?.risks}
                      recommendations={s?.bm_recommendations}
                      recLabel="Rekomendasi BM"
                    />
                    <div className="card">
                      <label className="label">Notes BM untuk {fwss.name}</label>
                      <textarea
                        rows={3}
                        className="w-full px-3 py-2 text-sm resize-y"
                        placeholder={`Strategi & arahan untuk ${fwss.name}`}
                        value={notes[fwss.id] || ''}
                        onChange={(e) => setNotes((n) => ({ ...n, [fwss.id]: e.target.value }))}
                      />
                      <label className="label mt-3">Strategic Action Plan</label>
                      <ActionPlanEditor
                        templates={ACTION_TEMPLATES([fwss.name])}
                        value={actions[fwss.id] || []}
                        onChange={(v) => setActions((a) => ({ ...a, [fwss.id]: v }))}
                      />
                      <button onClick={() => handleSave(fwss.id)} disabled={saving} className="btn-teal w-full mt-3">
                        {savedFor[fwss.id] ? <CheckCircle2 size={16} /> : <Save size={16} />}
                        {savedFor[fwss.id] ? 'Tersimpan ✓' : 'Simpan Notes & Action Plan'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </Layout>
  );
}
