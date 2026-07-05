import { useEffect, useRef, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Save, CheckCircle2, Lock, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import SlotFormRenderer from '../components/SlotFormRenderer';
import { FullSpinner, ErrorBox } from '../components/ui';
import { emptyPlanByDay, normalizePlanByDay, formSchemaFor } from '../constants/timeSlots';
import { fetchWeeklyPlan, upsertWeeklyPlan, fetchAllUsers } from '../lib/db';
import { currentWeekId, WEEKDAYS, dayKeyFromDate, isStructuredFilled, isWeeklyPlanOpen, nowDate, clsx, weeklyPlanEditableWeeks, weeklyPlanTargetDatesFor } from '../lib/utils';
import { useUnsavedWarning } from '../hooks/useUnsavedWarning';

export default function WeeklyPlan() {
  const { user, dashboardPath } = useAuth();
  const navigate = useNavigate();

  if (user.role === 'FWSS' || user.role === 'BM') {
    return <Navigate to={dashboardPath()} replace />;
  }

  const [planByDay, setPlanByDay] = useState(() => emptyPlanByDay(user.role));
  const [activeDay, setActiveDay] = useState(() => dayKeyFromDate(new Date()) || 'monday');
  const [users, setUsers] = useState({ allSupervisors: [], allSubordinates: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const planOpen = isWeeklyPlanOpen(nowDate());
  const editableWeeks = weeklyPlanEditableWeeks();
  const defaultWeek = editableWeeks.includes(currentWeekId()) ? currentWeekId() : editableWeeks[0];
  const [selectedWeekId, setSelectedWeekId] = useState(defaultWeek);
  const weekDates = weeklyPlanTargetDatesFor(selectedWeekId);
  const draftKey = `icu_wp_${user.id}_${selectedWeekId}`;

  function weekTabLabel(wid) {
    const cw = currentWeekId();
    if (wid === cw) return 'Minggu Ini';
    if (wid < cw) return 'Minggu Lalu';
    return 'Minggu Depan';
  }
  const weekLabel = weekTabLabel(selectedWeekId);

  useUnsavedWarning(isDirty && planOpen);

  useEffect(() => {
    setLoading(true);
    setPlanByDay(emptyPlanByDay(user.role));
    setSubmitted(false);
    setIsDirty(false);
    (async () => {
      try {
        const SUPERVISOR_ROLES = { FA: ['FWSS','BM','RH'], FWSS: ['BM','RH'], BM: ['RH'] };
        const SUBORDINATE_ROLES = { FWSS: ['FA','BM'], BM: ['FWSS','FA'], RH: ['BM','FWSS','FA'] };
        const [existing, allUsersList] = await Promise.all([
          fetchWeeklyPlan(user.id, selectedWeekId),
          fetchAllUsers(),
        ]);

        const key = `icu_wp_${user.id}_${selectedWeekId}`;
        const isSubmitted = Boolean(existing?.submitted_at);
        setSubmitted(isSubmitted);

        if (isSubmitted) {
          // Plan sudah disubmit — hapus draft dan gunakan data DB
          sessionStorage.removeItem(key);
          setPlanByDay(normalizePlanByDay(existing.slots, user.role));
        } else {
          // Cek apakah ada draft di sessionStorage yang lebih baru
          const draftRaw = sessionStorage.getItem(key);
          if (draftRaw) {
            try {
              setPlanByDay(normalizePlanByDay(JSON.parse(draftRaw), user.role));
              setIsDirty(true);
            } catch {
              if (existing?.slots) setPlanByDay(normalizePlanByDay(existing.slots, user.role));
            }
          } else if (existing?.slots) {
            setPlanByDay(normalizePlanByDay(existing.slots, user.role));
          }
        }

        const allSupervisors = allUsersList.filter((u) => SUPERVISOR_ROLES[user.role]?.includes(u.role));
        const allSubordinates = allUsersList.filter((u) => SUBORDINATE_ROLES[user.role]?.includes(u.role));
        setUsers({ allSupervisors, allSubordinates });
      } catch (e) {
        setError(e.message || 'Gagal memuat rencana.');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, selectedWeekId]);

  // Auto-save draft ke sessionStorage saat planByDay berubah (debounce 500ms)
  useEffect(() => {
    if (loading || submitted || !planOpen) return;
    const timer = setTimeout(() => {
      try { sessionStorage.setItem(draftKey, JSON.stringify(planByDay)); } catch {}
    }, 500);
    return () => clearTimeout(timer);
  }, [planByDay, draftKey, loading, submitted, planOpen]);

  const slots = planByDay[activeDay] || [];

  function updateSlot(idx, patch) {
    setIsDirty(true);
    setPlanByDay((prev) => ({
      ...prev,
      [activeDay]: prev[activeDay].map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));
  }

  async function persist(next, submit) {
    await upsertWeeklyPlan({ userId: user.id, role: user.role, weekId: selectedWeekId, slots: next, submit });
    sessionStorage.removeItem(draftKey);
    setIsDirty(false);
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
    <Layout title={planOpen ? `Rencana ${weekLabel}` : 'Rencana Minggu Ini'} back={true}>
      {loading ? (
        <FullSpinner label="Memuat rencana..." />
      ) : (
        <div className="space-y-5">
          {error && <ErrorBox>{error}</ErrorBox>}

          <div className="card">
            <p className="text-sm font-semibold">{selectedWeekId} · {user.role}</p>
            <p className="text-xs text-text-muted mt-0.5">
              {planOpen ? `Rencanakan aktivitas Senin–Jumat ${weekLabel.toLowerCase()}` : 'Rencanakan aktivitas Senin–Jumat minggu ini'}
            </p>
            {submitted && (
              <p className="inline-flex items-center gap-1.5 text-xs text-score-4 mt-2">
                <CheckCircle2 size={14} /> Rencana {weekLabel.toLowerCase()} sudah disubmit
              </p>
            )}
            {isDirty && planOpen && !submitted && (
              <p className="inline-flex items-center gap-1.5 text-xs text-score-2 mt-2">
                · Ada perubahan yang belum disimpan
              </p>
            )}
          </div>

          {!planOpen && (
            <div className="card border-score-2/40 bg-score-2/10">
              <p className="flex items-center gap-2 text-sm font-semibold text-score-2">
                <Lock size={16} /> Weekly Plan sedang ditutup
              </p>
              <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                Penyusunan rencana mingguan dibuka setiap <b>Jumat</b>. Di luar
                jadwal itu Anda hanya dapat melihat rencana yang sudah tersimpan. Untuk menambah
                kegiatan di tengah minggu (mis. follow-up lead), gunakan <b>Tambah Rencana Tambahan</b> di
                halaman <b>Input Aktivitas</b>.
              </p>
            </div>
          )}

          {/* Notifikasi jika belum ada bawahan terdeteksi (untuk FWSS/BM) */}
          {['FWSS', 'BM'].includes(user.role) && !loading && users.allSubordinates.length === 0 && (
            <div className="card border-score-2/40 bg-score-2/10">
              <p className="flex items-center gap-2 text-sm font-semibold text-score-2">
                <Users size={16} /> Belum ada bawahan terdeteksi
              </p>
              <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                Pastikan akun {user.role === 'FWSS' ? 'FA' : 'FWSS'} yang Anda bimbing sudah mendaftar
                dan memilih Anda sebagai atasan saat onboarding. Jika sudah terdaftar tapi belum muncul,
                minta mereka masuk ke halaman onboarding dan pilih ulang atasannya.
              </p>
            </div>
          )}

          {/* Tab pilih minggu — muncul saat ada 2 minggu yang bisa diedit */}
          {editableWeeks.length > 1 && planOpen && (
            <div className="flex gap-1 p-1 bg-elevated rounded-lg self-start">
              {editableWeeks.map((wid) => (
                <button key={wid} onClick={() => setSelectedWeekId(wid)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    selectedWeekId === wid ? 'bg-white shadow text-ink' : 'text-text-secondary hover:text-ink'
                  }`}>
                  {weekTabLabel(wid)}
                </button>
              ))}
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
