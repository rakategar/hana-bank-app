import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, CheckCircle2, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import SlotFormRenderer from '../components/SlotFormRenderer';
import { FullSpinner, ErrorBox } from '../components/ui';
import { emptyPlanByDay, normalizePlanByDay, formSchemaFor } from '../constants/timeSlots';
import { fetchWeeklyPlan, upsertWeeklyPlan, fetchSubordinates, fetchUserMaybe } from '../lib/db';
import { currentWeekId, WEEKDAYS, dayKeyFromDate, isStructuredFilled, isWeeklyPlanOpen, nowDate, clsx, weekdayDatesOf } from '../lib/utils';

export default function WeeklyPlan() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [planByDay, setPlanByDay] = useState(() => emptyPlanByDay(user.role));
  const [activeDay, setActiveDay] = useState(() => dayKeyFromDate(new Date()) || 'monday');
  const [users, setUsers] = useState({ supervisor: null, subordinates: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const planOpen = isWeeklyPlanOpen(nowDate());
  const weekDates = weekdayDatesOf(nowDate());

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

  return (
    <Layout title="Rencana Minggu Ini" back={true}>
      {loading ? (
        <FullSpinner label="Memuat rencana..." />
      ) : (
        <div className="space-y-5">
          {error && <ErrorBox>{error}</ErrorBox>}

          <div className="card">
            <p className="text-sm font-semibold">{currentWeekId()} · {user.role}</p>
            <p className="text-xs text-text-muted mt-0.5">Jadwalkan aktivitas Senin–Jumat</p>
            {submitted && (
              <p className="inline-flex items-center gap-1.5 text-xs text-score-4 mt-2">
                <CheckCircle2 size={14} /> Rencana minggu ini sudah disubmit
              </p>
            )}
          </div>

          {!planOpen && (
            <div className="card border-score-2/40 bg-score-2/10">
              <p className="flex items-center gap-2 text-sm font-semibold text-score-2">
                <Lock size={16} /> Weekly Plan sedang ditutup
              </p>
              <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                Penyusunan rencana mingguan dibuka tiap <b>Jumat</b> serta <b>5–7 Juni</b>. Di luar
                jadwal itu Anda hanya dapat melihat rencana yang sudah tersimpan. Untuk menambah
                kegiatan di tengah minggu (mis. follow-up lead), gunakan <b>Tambah Rencana Tambahan</b> di
                halaman <b>Input Aktivitas</b>.
              </p>
            </div>
          )}

          {/* Tab hari Senin–Jumat */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {WEEKDAYS.map((w, i) => {
              const dayFilled = (planByDay[w.key] || []).some((s) => isStructuredFilled(s.data));
              const dateLabel = weekDates[i]?.label || w.label;
              return (
                <button
                  key={w.key}
                  onClick={() => setActiveDay(w.key)}
                  className={clsx(
                    'px-3 py-2 rounded-lg text-sm font-semibold border whitespace-nowrap transition-colors',
                    activeDay === w.key
                      ? 'bg-hana-teal-500 text-white border-hana-teal-500'
                      : 'bg-white text-text-secondary border-hana-border hover:border-hana-teal-500'
                  )}
                >
                  {dateLabel}
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
                    readOnly={!planOpen}
                  />
                </div>
              );
            })}
          </div>

          {planOpen && (
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end sticky bottom-4">
              <button onClick={() => save(false)} disabled={saving} className="btn-ghost sm:w-auto">
                <Save size={16} /> Simpan Draft
              </button>
              <button onClick={() => save(true)} disabled={saving} className="btn-teal sm:w-auto">
                <CheckCircle2 size={16} /> Submit Rencana
              </button>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
