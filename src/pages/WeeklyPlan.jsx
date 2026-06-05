import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, CheckCircle2, Lock, CalendarDays, Clock3, FileCheck2, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import SlotFormRenderer from '../components/SlotFormRenderer';
import UnderlineTabs from '../components/login/UnderlineTabs';
import { emptyPlanByDay, normalizePlanByDay, formSchemaFor } from '../constants/timeSlots';
import { fetchWeeklyPlan, upsertWeeklyPlan, fetchSubordinates, fetchUserMaybe } from '../lib/db';
import { currentWeekId, WEEKDAYS, dayKeyFromDate, isStructuredFilled, isWeeklyPlanOpen, nowDate, clsx } from '../lib/utils';

function PlanStat({ label, value, helper, icon: Icon, tone = 'default' }) {
  const warning = tone === 'warning';
  return (
    <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-card backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
        <span className={clsx('grid h-9 w-9 place-items-center rounded-xl', warning ? 'bg-score-2/10 text-score-2' : 'bg-hana-teal-50 text-hana-teal-700')}>
          <Icon size={17} />
        </span>
      </div>
      <p className="font-display text-3xl font-extrabold leading-none text-ink">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-text-secondary">{helper}</p>
    </div>
  );
}

function WeeklyPlanHeader({ weekId, role, activeDayLabel, submitted, planOpen }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h2 className="font-display text-2xl font-extrabold leading-tight text-ink sm:text-3xl">Buat Rencana Minggu Ini</h2>
        <p className="mt-1 text-sm text-text-secondary">Susun prioritas aktivitas sales untuk minggu berjalan.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className={clsx('badge', submitted ? 'border-score-4/25 bg-score-4/10 text-score-4' : 'border-hana-border bg-elevated text-text-secondary')}>
          <CheckCircle2 size={13} /> {submitted ? 'Sudah submit' : 'Belum submit'}
        </span>
        <span className={clsx('badge', planOpen ? 'border-hana-teal-100 bg-hana-teal-50 text-hana-teal-700' : 'border-score-2/25 bg-score-2/10 text-score-2')}>
          {planOpen ? <FileCheck2 size={13} /> : <Lock size={13} />}
          {planOpen ? 'Terbuka untuk edit' : 'Read-only'}
        </span>
      </div>
    </div>
  );
}

function WeeklyClosedNotice() {
  return (
    <div className="rounded-2xl border border-score-2/25 bg-score-2/10 p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-score-2">
        <AlertTriangle size={16} /> Weekly Plan sedang ditutup
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
        Penyusunan rencana mingguan dibuka tiap <b>Jumat</b> serta <b>5-7 Juni</b>. Di luar jadwal itu Anda hanya dapat melihat rencana yang sudah tersimpan.
      </p>
    </div>
  );
}

function WeeklySlotCard({ slot, timeLabel, filled, children }) {
  return (
    <div className="rounded-2xl border border-hana-border/70 bg-white/80 shadow-card backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3 border-b border-hana-border/70 px-4 py-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-hana-teal-50 px-2.5 py-1 font-display text-sm font-bold text-hana-teal-700">{timeLabel}</span>
            <span className={clsx('badge', filled ? 'border-hana-teal-100 bg-hana-teal-50 text-hana-teal-700' : 'border-hana-border bg-elevated text-text-secondary')}>
              {filled ? 'Terisi' : 'Kosong'}
            </span>
          </div>
          <p className="truncate text-sm font-bold text-ink">{slot.label}</p>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function WeeklyPlanSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="skeleton h-8 w-64" />
          <div className="skeleton h-4 w-80 max-w-full" />
        </div>
        <div className="flex gap-2">
          <div className="skeleton h-7 w-24 rounded-full" />
          <div className="skeleton h-7 w-32 rounded-full" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="card space-y-3 p-4">
            <div className="flex items-center justify-between">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-9 w-9 rounded-xl" />
            </div>
            <div className="skeleton h-8 w-16" />
            <div className="skeleton h-3 w-32" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 border-b border-hana-border">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex justify-center px-3 pb-3 pt-1">
            <div className="skeleton h-4 w-14" />
          </div>
        ))}
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-hana-border px-4 py-4 sm:px-6">
          <div className="space-y-2">
            <div className="skeleton h-5 w-24" />
            <div className="skeleton h-3 w-40" />
          </div>
          <div className="skeleton h-7 w-20 rounded-full" />
        </div>
        <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-hana-border/70 bg-white/80 shadow-card">
              <div className="border-b border-hana-border/70 px-4 py-3">
                <div className="mb-2 flex gap-2">
                  <div className="skeleton h-7 w-28 rounded-lg" />
                  <div className="skeleton h-7 w-16 rounded-full" />
                </div>
                <div className="skeleton h-4 w-52 max-w-full" />
              </div>
              <div className="space-y-3 p-4">
                <div className="space-y-1.5">
                  <div className="skeleton h-3 w-24" />
                  <div className="skeleton h-11 w-full rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <div className="skeleton h-3 w-28" />
                  <div className="skeleton h-24 w-full rounded-xl" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StickyPlanActions({ saving, submitted, onSaveDraft, onSubmit }) {
  return (
    <div className="sticky bottom-4 z-10 mt-2">
      <div className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/90 p-3 shadow-card backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-medium text-text-muted">
          {submitted ? 'Rencana sudah pernah disubmit. Perubahan berikutnya dapat disimpan ulang.' : 'Simpan sebagai draft atau submit rencana minggu ini.'}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button onClick={onSaveDraft} disabled={saving} className="btn-ghost sm:w-auto">
            <Save size={16} /> Simpan Draft
          </button>
          <button onClick={onSubmit} disabled={saving} className="btn-teal sm:w-auto">
            <CheckCircle2 size={16} /> Submit Rencana
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WeeklyPlan() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [planByDay, setPlanByDay] = useState(() => emptyPlanByDay(user.role));
  const [activeDay, setActiveDay] = useState(() => dayKeyFromDate(new Date()) || 'monday');
  const [users, setUsers] = useState({ supervisor: null, subordinates: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const planOpen = isWeeklyPlanOpen(nowDate());
  const weekId = currentWeekId();

  useEffect(() => {
    (async () => {
      try {
        const [existing, supervisor, subordinates] = await Promise.all([
          fetchWeeklyPlan(user.id, weekId),
          user.supervisor_id ? fetchUserMaybe(user.supervisor_id) : Promise.resolve(null),
          fetchSubordinates(user.id),
        ]);
        if (existing?.slots) {
          setPlanByDay(normalizePlanByDay(existing.slots, user.role));
          setSubmitted(Boolean(existing.submitted_at));
        }
        setUsers({ supervisor, subordinates });
      } catch (e) {
        toast.error(e.message || 'Gagal memuat rencana.');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, user.supervisor_id]);

  const slots = planByDay[activeDay] || [];
  const allSlots = WEEKDAYS.flatMap((day) => planByDay[day.key] || []);
  const filledSlots = allSlots.filter((slot) => isStructuredFilled(slot.data)).length;
  const filledDays = WEEKDAYS.filter((day) => (planByDay[day.key] || []).some((slot) => isStructuredFilled(slot.data))).length;
  const activeDayLabel = WEEKDAYS.find((day) => day.key === activeDay)?.label || activeDay;
  const dayTabs = WEEKDAYS.map((day) => {
    const dayFilled = (planByDay[day.key] || []).some((slot) => isStructuredFilled(slot.data));
    return {
      value: day.key,
      label: (
        <span className="inline-flex items-center gap-2">
          {day.label}
          {dayFilled && <span className="h-1.5 w-1.5 rounded-full bg-hana-teal-500" />}
        </span>
      ),
    };
  });

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
    try {
      await persist(planByDay, submit);
      if (submit) {
        setSubmitted(true);
        navigate(-1);
      }
    } catch (e) {
      toast.error(e.message || 'Gagal menyimpan rencana.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout title="Rencana Minggu Ini">
      {loading ? (
        <WeeklyPlanSkeleton />
      ) : (
        <div className="space-y-6">
          <WeeklyPlanHeader
            weekId={weekId}
            role={user.role}
            activeDayLabel={activeDayLabel}
            submitted={submitted}
            planOpen={planOpen}
          />

          {!planOpen && <WeeklyClosedNotice />}

          <div className="grid gap-4 sm:grid-cols-3">
            <PlanStat label="Hari Terisi" value={`${filledDays}/5`} helper="Hari kerja dengan minimal satu rencana." icon={CalendarDays} />
            <PlanStat label="Slot Terisi" value={filledSlots} helper={`Dari total ${allSlots.length} slot mingguan.`} icon={Clock3} />
            <PlanStat label="Status" value={planOpen ? 'Open' : 'Locked'} helper={planOpen ? 'Draft dan submit tersedia.' : 'Hanya bisa melihat rencana.'} icon={planOpen ? FileCheck2 : Lock} tone={planOpen ? 'default' : 'warning'} />
          </div>

          <UnderlineTabs tabs={dayTabs} activeValue={activeDay} onChange={setActiveDay} />

          <div className="card !p-0 overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-hana-border px-4 py-4 sm:px-6">
              <div>
                <p className="font-display text-lg font-extrabold text-ink">{activeDayLabel}</p>
                <p className="text-xs text-text-muted">{slots.length} slot rencana untuk hari ini.</p>
              </div>
              <span className="badge-teal">{slots.filter((slot) => isStructuredFilled(slot.data)).length}/{slots.length} terisi</span>
            </div>
            <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-2">
              {slots.map((slot, idx) => {
                const timeLabel = slot.endTime ? `${slot.time} - ${slot.endTime}` : slot.time;
                const filled = isStructuredFilled(slot.data);
                return (
                  <WeeklySlotCard key={slot.time} slot={slot} timeLabel={timeLabel} filled={filled}>
                    <SlotFormRenderer
                      schema={formSchemaFor(user.role, slot.time)}
                      value={slot.data || {}}
                      onChange={(data) => updateSlot(idx, { data })}
                      users={users}
                      readOnly={!planOpen}
                    />
                  </WeeklySlotCard>
                );
              })}
            </div>
          </div>

          {planOpen && (
            <StickyPlanActions
              saving={saving}
              submitted={submitted}
              onSaveDraft={() => save(false)}
              onSubmit={() => save(true)}
            />
          )}
        </div>
      )}
    </Layout>
  );
}
