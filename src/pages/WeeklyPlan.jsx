import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, CheckCircle2, Trash2, Wand2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import SlotFormRenderer from '../components/SlotFormRenderer';
import { FullSpinner, ErrorBox, Spinner } from '../components/ui';
import { emptyPlanByDay, emptyDaySlots, normalizePlanByDay, formSchemaFor } from '../constants/timeSlots';
import { fetchWeeklyPlan, upsertWeeklyPlan, fetchSubordinates, fetchUserMaybe } from '../lib/db';
import { generateDummyWeeklyPlan } from '../lib/dummyData';
import { IS_DEMO } from '../lib/appMode';
import { currentWeekId, WEEKDAYS, dayKeyFromDate, isStructuredFilled, clsx } from '../lib/utils';

export default function WeeklyPlan() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [planByDay, setPlanByDay] = useState(() => emptyPlanByDay(user.role));
  const [activeDay, setActiveDay] = useState(() => dayKeyFromDate(new Date()) || 'monday');
  const [users, setUsers] = useState({ supervisor: null, subordinates: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [existing, supervisor, subordinates] = await Promise.all([
          fetchWeeklyPlan(user.id, currentWeekId()),
          user.supervisor_id ? fetchUserMaybe(user.supervisor_id) : Promise.resolve(null),
          fetchSubordinates(user.id),
        ]);
        if (existing?.slots) {
          setPlanByDay(normalizePlanByDay(existing.slots, user.role));
          setSubmitted(Boolean(existing.submitted_at));
        }
        setUsers({ supervisor, subordinates });
      } catch (e) {
        setError(e.message || 'Gagal memuat rencana.');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, user.supervisor_id]);

  const slots = planByDay[activeDay] || [];

  function updateSlot(idx, patch) {
    setPlanByDay((prev) => ({
      ...prev,
      [activeDay]: prev[activeDay].map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));
  }

  async function persist(next, submit) {
    await upsertWeeklyPlan({ userId: user.id, role: user.role, slots: next, submit });
  }

  async function save(submit) {
    setSaving(true);
    setError('');
    try {
      await persist(planByDay, submit);
      if (submit) {
        setSubmitted(true);
        navigate(-1);
      }
    } catch (e) {
      setError(e.message || 'Gagal menyimpan rencana.');
    } finally {
      setSaving(false);
    }
  }

  // Kosongkan jadwal HARI yang aktif
  async function handleClearDay() {
    setBusy('clear');
    setError('');
    try {
      const next = { ...planByDay, [activeDay]: emptyDaySlots(user.role) };
      setPlanByDay(next);
      await persist(next, false);
    } catch (e) {
      setError(e.message || 'Gagal mengosongkan jadwal hari ini.');
    } finally {
      setBusy('');
    }
  }

  // Mode demo: isi hari aktif dengan data dummy
  async function handleAddDummy() {
    setBusy('dummy');
    setError('');
    try {
      const dayIndex = WEEKDAYS.findIndex((w) => w.key === activeDay);
      const next = { ...planByDay, [activeDay]: generateDummyWeeklyPlan(user.role, dayIndex) };
      setPlanByDay(next);
      await persist(next, true);
      setSubmitted(true);
    } catch (e) {
      setError(e.message || 'Gagal menambah dummy rencana.');
    } finally {
      setBusy('');
    }
  }

  return (
    <Layout title="Rencana Minggu Ini" back={true}>
      {loading ? (
        <FullSpinner label="Memuat rencana..." />
      ) : (
        <div className="space-y-5">
          {error && <ErrorBox>{error}</ErrorBox>}

          <div className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{currentWeekId()} · {user.role}</p>
              <p className="text-xs text-text-muted mt-0.5">Jadwalkan aktivitas Senin–Jumat</p>
              {submitted && (
                <p className="inline-flex items-center gap-1.5 text-xs text-score-4 mt-2">
                  <CheckCircle2 size={14} /> Rencana minggu ini sudah disubmit
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {IS_DEMO && (
                <button onClick={handleAddDummy} disabled={Boolean(busy)} className="btn-ghost !py-2 text-xs border-hana-teal-500/40 text-hana-teal-700">
                  {busy === 'dummy' ? <Spinner size={14} /> : <Wand2 size={14} />} Dummy {WEEKDAYS.find((w) => w.key === activeDay)?.label}
                </button>
              )}
              <button onClick={handleClearDay} disabled={Boolean(busy)} className="btn-ghost !py-2 text-xs border-score-1/40 text-score-1">
                {busy === 'clear' ? <Spinner size={14} /> : <Trash2 size={14} />} Kosongkan Hari Ini
              </button>
            </div>
          </div>

          {/* Tab hari Senin–Jumat */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {WEEKDAYS.map((w) => {
              const dayFilled = (planByDay[w.key] || []).some((s) => isStructuredFilled(s.data));
              return (
                <button
                  key={w.key}
                  onClick={() => setActiveDay(w.key)}
                  className={clsx(
                    'px-4 py-2 rounded-lg text-sm font-semibold border whitespace-nowrap transition-colors',
                    activeDay === w.key
                      ? 'bg-hana-teal-500 text-white border-hana-teal-500'
                      : 'bg-white text-text-secondary border-hana-border hover:border-hana-teal-500'
                  )}
                >
                  {w.label}
                  {dayFilled && <span className={clsx('ml-1.5 inline-block h-1.5 w-1.5 rounded-full', activeDay === w.key ? 'bg-white' : 'bg-hana-teal-500')} />}
                </button>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {slots.map((slot, idx) => {
              const timeLabel = slot.endTime ? `${slot.time} – ${slot.endTime}` : slot.time;
              return (
                <div key={slot.time} className="card">
                  <div className="flex items-center gap-2 mb-3 min-w-0">
                    <span className="font-display font-bold text-hana-teal-700 shrink-0">{timeLabel}</span>
                    <span className="text-sm font-semibold leading-tight truncate">{slot.label}</span>
                  </div>
                  <SlotFormRenderer
                    schema={formSchemaFor(user.role, slot.time)}
                    value={slot.data || {}}
                    onChange={(data) => updateSlot(idx, { data })}
                    users={users}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end sticky bottom-4">
            <button onClick={() => save(false)} disabled={saving} className="btn-ghost sm:w-auto">
              <Save size={16} /> Simpan Draft
            </button>
            <button onClick={() => save(true)} disabled={saving} className="btn-teal sm:w-auto">
              <CheckCircle2 size={16} /> Submit Rencana
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
