import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Save, AlertTriangle, CheckCircle2, FolderClock, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/Layout';
import { FullSpinner, ErrorBox, Spinner } from '../../components/ui';
import { PersonSummaryCard, ActionPlanEditor } from '../../components/summary';
import {
  fetchAllUsers,
  fetchWeeklyPlan,
  fetchDailyActivity,
  fetchScore,
  fetchSummaryFor,
  upsertSummary,
  createExtraPlan,
  logActivity,
} from '../../lib/db';
import { summarizeForFwss } from '../../lib/ai';
import { slotsForRole } from '../../constants/timeSlots';
import { todayISO, currentWeekId, weekdayDatesOf, nowDate, statusFromLevel, clsx } from '../../lib/utils';

const FWSS_SLOTS = slotsForRole('FWSS');
const FWSS_TIME_OPTIONS = FWSS_SLOTS.map((s) => s.time);

// Role-role yang bisa dipilih FWSS untuk di-summary
const SUMMARY_ROLES = ['FA', 'BM'];

const ACTION_TEMPLATES = (memberNames) => [
  ...memberNames.map((n) => `Coaching individual dengan ${n}`),
  'Joint meeting / assisted selling',
  'Follow-up pipeline bersama tim',
  'Eskalasi ke BM',
];

export default function FWSSSummary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const scheduleDateOptions = weekdayDatesOf(nowDate()).filter((d) => d.value >= todayISO());
  const [members, setMembers] = useState([]);      // FA + BM semua
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [aiResult, setAiResult] = useState(null);

  const [notes, setNotes] = useState({});
  const [actions, setActions] = useState({});
  const [savedFor, setSavedFor] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const allUsers = await fetchAllUsers();
        const eligible = allUsers.filter((u) => SUMMARY_ROLES.includes(u.role));
        setMembers(eligible);
        setSelectedIds(new Set());

        const existing = await Promise.all(
          eligible.map((m) => fetchSummaryFor({ supervisorId: user.id, targetUserId: m.id }))
        );
        const n = {}, a = {};
        let savedData = null;
        existing.forEach((row, i) => {
          if (row) {
            n[eligible[i].id] = row.supervisor_notes || '';
            a[eligible[i].id] = row.action_plans || [];
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

  function toggle(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() { setSelectedIds(new Set(members.map((m) => m.id))); }
  function clearAll() { setSelectedIds(new Set()); }

  async function handleGenerate() {
    setGenerating(true);
    setError('');
    try {
      const targets = members.filter((m) => selectedIds.has(m.id));
      const faData = await Promise.all(
        targets.map(async (m) => {
          const [plan, activity, score] = await Promise.all([
            fetchWeeklyPlan(m.id, currentWeekId()),
            fetchDailyActivity(m.id, todayISO()),
            fetchScore(m.id, todayISO()),
          ]);
          return {
            id: m.id,
            name: m.name,
            role: m.role,
            weeklyPlan: plan?.slots || null,
            activities: activity?.activities || null,
            score: score
              ? { daily_average: score.daily_average, daily_level: score.daily_level, scores: score.scores }
              : null,
          };
        })
      );
      const result = await summarizeForFwss({ faData });
      const levelById = Object.fromEntries(faData.map((m) => [m.id, m.score?.daily_level ?? null]));
      const nameById = Object.fromEntries(faData.map((m) => [m.id, m.name]));
      (result?.fa_summaries || []).forEach((s) => {
        const id = s.fa_id || Object.keys(nameById).find((k) => nameById[k] === s.fa_name);
        if (id && id in levelById) s.performance_status = statusFromLevel(levelById[id]);
      });
      setAiResult(result);
      logActivity({ userId: user.id, role: user.role, action: 'fwss_summary_generated', metadata: { member_count: targets.length } });
    } catch (e) {
      setError(e.message || 'Gagal generate summary.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave(memberId) {
    setSaving(true);
    setError('');
    try {
      const member = members.find((x) => x.id === memberId);
      const mSummary = aiResult?.fa_summaries?.find((f) => f.fa_id === memberId || f.fa_name === member?.name);

      const items = actions[memberId] || [];
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
            data: member ? { target_fa: member.name } : {},
            source: 'fwss_action',
          });
          updatedItems.push({ ...item, schedule: { ...item.schedule, extra_plan_id: row.id } });
        } else {
          updatedItems.push(item);
        }
      }

      await upsertSummary({
        supervisorId: user.id,
        targetUserId: memberId,
        aiSummary: mSummary?.summary || null,
        summaryData: aiResult,
        supervisorNotes: notes[memberId] || '',
        actionPlans: updatedItems,
      });
      setActions((a) => ({ ...a, [memberId]: updatedItems }));
      setSavedFor((s) => ({ ...s, [memberId]: true }));
      logActivity({ userId: user.id, role: user.role, action: 'fwss_summary_saved', entityId: memberId });
      setTimeout(() => setSavedFor((s) => ({ ...s, [memberId]: false })), 2500);
    } catch (e) {
      setError(e.message || 'Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  }

  function matchSummary(member) {
    return aiResult?.fa_summaries?.find((s) => s.fa_id === member.id || s.fa_name === member.name);
  }

  // Grup member berdasarkan role untuk UI
  const membersByRole = SUMMARY_ROLES.reduce((acc, role) => {
    acc[role] = members.filter((m) => m.role === role);
    return acc;
  }, {});

  const displayMembers = members.filter((m) => selectedIds.has(m.id));

  return (
    <Layout title="Summary Tim" back="/dashboard/fwss">
      {loading ? (
        <FullSpinner label="Memuat data tim..." />
      ) : (
        <div className="space-y-4">
          {error && <ErrorBox>{error}</ErrorBox>}

          <div className="flex justify-end">
            <button onClick={() => navigate('/notes-archive')} className="btn-ghost !py-2 text-xs">
              <FolderClock size={14} /> Arsip Catatan
            </button>
          </div>

          {/* Pilih anggota yang akan di-summary */}
          {members.length > 0 && (
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Pilih Anggota untuk Di-Summary</p>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="text-xs text-hana-teal-700 hover:underline">
                    Pilih Semua
                  </button>
                  <span className="text-text-muted">·</span>
                  <button onClick={clearAll} className="text-xs text-text-secondary hover:underline">
                    Batalkan Semua
                  </button>
                </div>
              </div>
              {SUMMARY_ROLES.map((role) => {
                const group = membersByRole[role] || [];
                if (group.length === 0) return null;
                return (
                  <div key={role}>
                    <p className="text-xs font-medium text-text-muted mb-1.5">{role}</p>
                    <div className="flex flex-wrap gap-2">
                      {group.map((m) => {
                        const active = selectedIds.has(m.id);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => toggle(m.id)}
                            className={clsx(
                              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                              active
                                ? 'bg-hana-teal-500 text-white border-hana-teal-500'
                                : 'bg-white text-text-secondary border-hana-border hover:border-hana-teal-400'
                            )}
                          >
                            {active && <Check size={11} />}
                            {m.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {members.length === 0 && (
            <div className="card text-center py-6">
              <p className="text-sm text-text-muted">Belum ada anggota tim terdaftar di sistem.</p>
            </div>
          )}

          {members.length > 0 && !aiResult && (
            <div className="card text-center py-8">
              <Bot size={36} className="text-hana-teal-700 mx-auto mb-3" />
              <p className="text-sm text-text-secondary mb-4">
                Generate ringkasan kinerja {selectedIds.size} anggota yang dipilih hari ini dengan bantuan AI.
              </p>
              <button
                onClick={handleGenerate}
                disabled={generating || selectedIds.size === 0}
                className="btn-teal mx-auto"
              >
                {generating ? <Spinner size={18} className="text-white" /> : <Bot size={18} />}
                {generating ? 'Sedang menganalisis data...' : `Generate Summary (${selectedIds.size} anggota)`}
              </button>
            </div>
          )}

          {aiResult && (
            <>
              <div className="flex justify-end">
                <button
                  onClick={handleGenerate}
                  disabled={generating || selectedIds.size === 0}
                  className="btn-ghost !py-2 text-xs"
                >
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

              {displayMembers.map((member) => {
                const s = matchSummary(member);
                return (
                  <div key={member.id} className="space-y-3">
                    <PersonSummaryCard
                      name={`${member.name} (${member.role})`}
                      status={s?.performance_status}
                      summary={s?.summary}
                      highlights={s?.highlights}
                      risks={s?.risks}
                      recommendations={s?.fwss_recommendations}
                      recLabel="Rekomendasi"
                    />
                    <div className="card">
                      <label className="label">Notes untuk {member.name}</label>
                      <textarea
                        rows={3}
                        className="w-full px-3 py-2 text-sm resize-y"
                        placeholder={`Apa yang akan Anda lakukan untuk ${member.name}?`}
                        value={notes[member.id] || ''}
                        onChange={(e) => setNotes((n) => ({ ...n, [member.id]: e.target.value }))}
                      />
                      <label className="label mt-3">Action Plan</label>
                      <ActionPlanEditor
                        templates={ACTION_TEMPLATES([member.name])}
                        value={actions[member.id] || []}
                        onChange={(v) => setActions((a) => ({ ...a, [member.id]: v }))}
                        scheduleEnabled
                        dateOptions={scheduleDateOptions}
                        timeOptions={FWSS_TIME_OPTIONS}
                      />
                      <button onClick={() => handleSave(member.id)} disabled={saving} className="btn-teal w-full mt-3">
                        {savedFor[member.id] ? <CheckCircle2 size={16} /> : <Save size={16} />}
                        {savedFor[member.id] ? 'Tersimpan ✓' : 'Simpan Notes & Action Plan'}
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
