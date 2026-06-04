import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Save, AlertTriangle, CheckCircle2, FolderClock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/Layout';
import { FullSpinner, ErrorBox, Spinner } from '../../components/ui';
import { PersonSummaryCard, ActionPlanEditor } from '../../components/summary';
import {
  fetchSubordinates,
  fetchWeeklyPlan,
  fetchDailyActivity,
  fetchScore,
  fetchSummaryFor,
  upsertSummary,
  createExtraPlan,
} from '../../lib/db';
import { summarizeForFwss } from '../../lib/gemini';
import { slotsForRole } from '../../constants/timeSlots';
import { todayISO, currentWeekId, weekdayDatesOf, nowDate, statusFromLevel } from '../../lib/utils';

const FWSS_SLOTS = slotsForRole('FWSS');
const FWSS_TIME_OPTIONS = FWSS_SLOTS.map((s) => s.time);

const ACTION_TEMPLATES = (faNames) => [
  ...faNames.map((n) => `Coaching individual dengan ${n}`),
  'Joint meeting / assisted selling',
  'Follow-up pipeline bersama FA',
  'Eskalasi ke BM',
];

export default function FWSSSummary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const scheduleDateOptions = weekdayDatesOf(nowDate()).filter((d) => d.value >= todayISO());
  const [fas, setFas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [aiResult, setAiResult] = useState(null);

  // notes & action plan per FA target
  const [notes, setNotes] = useState({});
  const [actions, setActions] = useState({});
  const [savedFor, setSavedFor] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const subs = await fetchSubordinates(user.id);
        setFas(subs);
        // muat summary tersimpan sebelumnya (jika ada)
        const existing = await Promise.all(
          subs.map((fa) => fetchSummaryFor({ supervisorId: user.id, targetUserId: fa.id }))
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
      } catch (e) {
        setError(e.message || 'Gagal memuat data.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user.id]);

  async function handleGenerate() {
    setGenerating(true);
    setError('');
    try {
      const faData = await Promise.all(
        fas.map(async (fa) => {
          const [plan, activity, score] = await Promise.all([
            fetchWeeklyPlan(fa.id, currentWeekId()),
            fetchDailyActivity(fa.id, todayISO()),
            fetchScore(fa.id, todayISO()),
          ]);
          return {
            id: fa.id,
            name: fa.name,
            weeklyPlan: plan?.slots || null,
            activities: activity?.activities || null,
            score: score
              ? { daily_average: score.daily_average, daily_level: score.daily_level, scores: score.scores }
              : null,
          };
        })
      );
      const result = await summarizeForFwss({ faData });
      // Audit: paksa performance_status sesuai daily_level nyata tiap FA.
      const levelById = Object.fromEntries(faData.map((fa) => [fa.id, fa.score?.daily_level ?? null]));
      const nameById = Object.fromEntries(faData.map((fa) => [fa.id, fa.name]));
      (result?.fa_summaries || []).forEach((s) => {
        const id = s.fa_id || Object.keys(nameById).find((k) => nameById[k] === s.fa_name);
        if (id && id in levelById) s.performance_status = statusFromLevel(levelById[id]);
      });
      setAiResult(result);
    } catch (e) {
      setError(e.message || 'Gagal generate summary.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave(faId) {
    setSaving(true);
    setError('');
    try {
      const fa = fas.find((x) => x.id === faId);
      const faSummary = aiResult?.fa_summaries?.find((f) => f.fa_id === faId || f.fa_name === fa?.name);

      // Aksi yang dijadwalkan & belum diinjeksi → buat extra_plan di agenda FWSS sendiri.
      const items = actions[faId] || [];
      const updatedItems = [];
      for (const item of items) {
        if (item.schedule?.date && item.schedule?.time && !item.schedule.extra_plan_id) {
          const slot = FWSS_SLOTS.find((s) => s.time === item.schedule.time);
          const row = await createExtraPlan({
            userId: user.id,
            role: 'FWSS',
            date: item.schedule.date,
            time: item.schedule.time,
            endTime: slot?.endTime || null,
            label: item.label,
            data: fa ? { target_fa: fa.name } : {},
            source: 'fwss_action',
          });
          updatedItems.push({ ...item, schedule: { ...item.schedule, extra_plan_id: row.id } });
        } else {
          updatedItems.push(item);
        }
      }

      await upsertSummary({
        supervisorId: user.id,
        targetUserId: faId,
        aiSummary: faSummary?.summary || null,
        summaryData: aiResult,
        supervisorNotes: notes[faId] || '',
        actionPlans: updatedItems,
      });
      setActions((a) => ({ ...a, [faId]: updatedItems }));
      setSavedFor((s) => ({ ...s, [faId]: true }));
      setTimeout(() => setSavedFor((s) => ({ ...s, [faId]: false })), 2500);
    } catch (e) {
      setError(e.message || 'Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  }

  function matchSummary(fa) {
    return aiResult?.fa_summaries?.find((s) => s.fa_id === fa.id || s.fa_name === fa.name);
  }

  return (
    <Layout title="Summary FA" back="/dashboard/fwss">
      {loading ? (
        <FullSpinner label="Memuat data FA..." />
      ) : (
        <div className="space-y-4">
          {error && <ErrorBox>{error}</ErrorBox>}

          <div className="flex justify-end">
            <button onClick={() => navigate('/notes-archive')} className="btn-ghost !py-2 text-xs">
              <FolderClock size={14} /> Arsip Catatan
            </button>
          </div>

          {!aiResult && (
            <div className="card text-center py-8">
              <Bot size={36} className="text-hana-teal-700 mx-auto mb-3" />
              <p className="text-sm text-text-secondary mb-4">
                Generate ringkasan kinerja {fas.length} FA hari ini dengan bantuan AI.
              </p>
              <button onClick={handleGenerate} disabled={generating} className="btn-teal mx-auto">
                {generating ? <Spinner size={18} className="text-white" /> : <Bot size={18} />}
                {generating ? 'Sedang menganalisis data FA...' : 'Generate Summary FA'}
              </button>
            </div>
          )}

          {aiResult && (
            <>
              <div className="flex justify-end">
                <button onClick={handleGenerate} disabled={generating} className="btn-ghost !py-2 text-xs">
                  {generating ? <Spinner size={14} /> : <Bot size={14} />} Regenerate
                </button>
              </div>

              {aiResult.team_overall && (
                <div className="card bg-hana-teal-500/5 border-hana-teal-500/30">
                  <p className="text-sm font-semibold text-hana-teal-700 mb-1">Ringkasan Tim</p>
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

              {fas.map((fa) => {
                const s = matchSummary(fa);
                return (
                  <div key={fa.id} className="space-y-3">
                    <PersonSummaryCard
                      name={fa.name}
                      status={s?.performance_status}
                      summary={s?.summary}
                      highlights={s?.highlights}
                      risks={s?.risks}
                      recommendations={s?.fwss_recommendations}
                      recLabel="Rekomendasi FWSS"
                    />
                    <div className="card">
                      <label className="label">Notes FWSS untuk {fa.name}</label>
                      <textarea
                        rows={3}
                        className="w-full px-3 py-2 text-sm resize-y"
                        placeholder={`Apa yang akan Anda lakukan untuk ${fa.name}?`}
                        value={notes[fa.id] || ''}
                        onChange={(e) => setNotes((n) => ({ ...n, [fa.id]: e.target.value }))}
                      />
                      <label className="label mt-3">Action Plan</label>
                      <ActionPlanEditor
                        templates={ACTION_TEMPLATES([fa.name])}
                        value={actions[fa.id] || []}
                        onChange={(v) => setActions((a) => ({ ...a, [fa.id]: v }))}
                        scheduleEnabled
                        dateOptions={scheduleDateOptions}
                        timeOptions={FWSS_TIME_OPTIONS}
                      />
                      <button onClick={() => handleSave(fa.id)} disabled={saving} className="btn-teal w-full mt-3">
                        {savedFor[fa.id] ? <CheckCircle2 size={16} /> : <Save size={16} />}
                        {savedFor[fa.id] ? 'Tersimpan ✓' : 'Simpan Notes & Action Plan'}
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
