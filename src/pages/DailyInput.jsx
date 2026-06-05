import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, CalendarOff, CalendarPlus, ChevronDown, ChevronUp, Clock3, CalendarDays, FileCheck2, Layers3, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import ActivitySlot from '../components/ActivitySlot';
import ExtraPlanModal from '../components/ExtraPlanModal';
import { toast } from 'react-hot-toast';
import { Spinner } from '../components/ui';
import { emptyPlanByDay, normalizePlanByDay, formSchemaFor } from '../constants/timeSlots';
import {
  fetchWeeklyPlan,
  fetchDailyActivity,
  upsertDailyActivity,
  upsertScore,
  fetchSubordinates,
  fetchUserMaybe,
  fetchExtraPlans,
  createExtraPlan,
} from '../lib/db';
import { scoreDailyActivities, isGeminiConfigured } from '../lib/gemini';
import {
  todayISO, currentWeekId, dayKeyFromDate, dayLabel, formatDateID,
  slotWindowState, slotWindow, fmtClock, nowDate, DEFAULT_DURATION,
  serializeStructuredData, isStructuredFilled,
} from '../lib/utils';

// Bangun slot harian dari jadwal hari tsb + rencana tambahan (extra plans).
// Pre-inisialisasi actual_data untuk list fields dengan resultSchema dari planned_data.
function buildSlots(daySchedule, savedActivity, role, extraPlans = []) {
  // Cocokkan saved activity via key (standar: time; extra: 'x-<id>') — fallback ke time.
  const savedByKey = new Map((savedActivity?.activities || []).map((a) => [a.key || a.time, a]));

  const standard = daySchedule.map((p) => {
    const saved = savedByKey.get(p.time) || {};
    const plannedData = p.data || {};
    const savedActual = saved.actual_data || {};

    // Pre-populate list fields dari planned_data jika actual_data belum ada
    const initActual = { ...savedActual };
    if (role) {
      const schema = formSchemaFor(role, p.time);
      schema.forEach((f) => {
        if (f.type === 'list' && f.resultSchema?.length > 0 && !initActual[f.key]) {
          const plannedItems = plannedData[f.key] || [];
          if (plannedItems.length > 0) {
            initActual[f.key] = plannedItems.map((item) => ({ ...item }));
          }
        }
      });
    }

    return {
      key: p.time,
      time: p.time,
      endTime: p.endTime,
      label: p.label,
      duration: p.duration ?? DEFAULT_DURATION,
      planned_data: plannedData,
      actual_data: initActual,
      actual: saved.actual || '',
      activity_status: saved.activity_status || 'not_done',
      notes: saved.notes || '',
      image_path: saved.image_path || null,
      image_url: saved.image_url || null,
    };
  });

  const extra = extraPlans.map((ep) => {
    const key = `x-${ep.id}`;
    const saved = savedByKey.get(key) || {};
    return {
      key,
      extraId: ep.id,
      extra: true,
      time: ep.time,
      endTime: ep.end_time || null,
      label: ep.label,
      duration: DEFAULT_DURATION,
      planned_data: ep.data || {},
      actual_data: saved.actual_data || {},
      actual: saved.actual || '',
      activity_status: saved.activity_status || 'not_done',
      notes: saved.notes || '',
      image_path: saved.image_path || null,
      image_url: saved.image_url || null,
    };
  });

  return [...standard, ...extra].sort((a, b) => a.time.localeCompare(b.time));
}

function syncActual(s) {
  return { ...s, actual: serializeStructuredData(s.actual_data) || s.actual || '' };
}

function applyGating(slots, date) {
  return slots.map((s0) => {
    const s = syncActual(s0);
    const state = slotWindowState(date, s.time, s.endTime);
    if (state === 'closed') {
      // Slot yang sudah diselesaikan tepat waktu (done/partial) dipertahankan.
      if (s.activity_status === 'done' || s.activity_status === 'partial') return s;
      return { ...s, activity_status: 'not_done' };
    }
    return s;
  });
}

// Slot dianggap "terisi" bila user sudah menandai selesai, mengisi hasil per item,
// atau menulis catatan/alasan.
function slotEngaged(s) {
  return (
    s.activity_status === 'done' ||
    s.activity_status === 'partial' ||
    isStructuredFilled(s.actual_data) ||
    (s.notes && s.notes.trim()) ||
    (s.actual && s.actual.trim())
  );
}

// Validasi sebelum simpan slot. Mengembalikan pesan error atau null bila valid.
function validateSlot(s, formSchema) {
  if (s.activity_status === 'done' || s.activity_status === 'partial') {
    const listFields = (formSchema || []).filter((f) => f.type === 'list' && f.resultSchema?.length > 0);
    for (const f of listFields) {
      const planned = Array.isArray(s.planned_data?.[f.key]) ? s.planned_data[f.key] : [];
      if (planned.length === 0) continue;
      const rows = Array.isArray(s.actual_data?.[f.key]) ? s.actual_data[f.key] : [];
      const allFilled = planned.every((_, i) => rows[i] && rows[i].status_aktual);
      if (!allFilled) return `Lengkapi hasil tiap item pada "${f.label}".`;
    }
    return null;
  }
  if (s.activity_status === 'not_done') {
    if (!s.notes || !s.notes.trim()) return 'Isi alasan terlebih dahulu jika slot tidak selesai.';
    return null;
  }
  return 'Pilih status slot terlebih dahulu (Done / Partial / Not Done).';
}

function DailyStat({ label, value, helper, icon: Icon, tone = 'default' }) {
  const warning = tone === 'warning';
  return (
    <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-card backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
        <span className={warning ? 'grid h-9 w-9 place-items-center rounded-xl bg-score-2/10 text-score-2' : 'grid h-9 w-9 place-items-center rounded-xl bg-hana-teal-50 text-hana-teal-700'}>
          <Icon size={17} />
        </span>
      </div>
      <p className="font-display text-3xl font-extrabold leading-none text-ink">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-text-secondary">{helper}</p>
    </div>
  );
}

function DailyHeader({ dayKey, date, now, openCount, onAddExtra, disabled }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h2 className="font-display text-2xl font-extrabold leading-tight text-ink sm:text-3xl">Input Aktivitas Hari Ini</h2>
        <p className="mt-1 text-sm text-text-secondary">Catat realisasi aktivitas sesuai slot waktu yang sedang berjalan.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="badge-neutral"><CalendarDays size={13} /> {dayLabel(dayKey)}, {formatDateID(date)}</span>
          <span className="badge-teal"><Clock3 size={13} /> {fmtClock(now)}</span>
          <span className="badge-neutral">{openCount} slot terbuka</span>
        </div>
      </div>
      <button onClick={onAddExtra} disabled={disabled} className="btn-ghost border-hana-teal-500/40 text-hana-teal-700 sm:w-auto">
        <CalendarPlus size={16} /> Tambah Rencana Tambahan
      </button>
    </div>
  );
}

function GeminiNotice() {
  return (
    <div className="rounded-2xl border border-score-2/25 bg-score-2/10 p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-score-2">
        <AlertTriangle size={16} /> Penilaian AI belum aktif
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
        `VITE_GEMINI_API_KEY` belum diset. Aktivitas tetap dapat disimpan, tetapi skor AI tidak akan tersedia.
      </p>
    </div>
  );
}

function DailyInputSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <div className="skeleton h-8 w-64" />
          <div className="skeleton h-4 w-96 max-w-full" />
          <div className="flex gap-2">
            <div className="skeleton h-7 w-40 rounded-full" />
            <div className="skeleton h-7 w-24 rounded-full" />
            <div className="skeleton h-7 w-28 rounded-full" />
          </div>
        </div>
        <div className="skeleton h-10 w-48 rounded-xl" />
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

      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="skeleton h-7 w-28 rounded-lg" />
                <div className="skeleton h-4 w-56 max-w-full" />
              </div>
              <div className="skeleton h-6 w-20 rounded-full" />
            </div>
            <div className="skeleton h-20 w-full rounded-xl" />
            <div className="grid grid-cols-3 gap-2">
              <div className="skeleton h-9 rounded-xl" />
              <div className="skeleton h-9 rounded-xl" />
              <div className="skeleton h-9 rounded-xl" />
            </div>
            <div className="skeleton h-10 w-28 rounded-xl ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DailyInput() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const date = todayISO();
  const dayKey = dayKeyFromDate(nowDate());

  const [slots, setSlots] = useState([]);
  const [users, setUsers] = useState({ supervisor: null, subordinates: [] });
  const [loading, setLoading] = useState(true);
  const [savedAt, setSavedAt] = useState(null);
  const [busy, setBusy] = useState('');
  const [busySlot, setBusySlot] = useState(null);
  const [showOthers, setShowOthers] = useState(false);
  const [showExtraModal, setShowExtraModal] = useState(false);

  const autoSaveTimer = useRef(null);
  const dirty = useRef(false);

  useEffect(() => {
    if (!dayKey) { setLoading(false); return; }
    (async () => {
      try {
        const [plan, activity, supervisor, subordinates, extraPlans] = await Promise.all([
          fetchWeeklyPlan(user.id, currentWeekId()),
          fetchDailyActivity(user.id, date),
          user.supervisor_id ? fetchUserMaybe(user.supervisor_id) : Promise.resolve(null),
          fetchSubordinates(user.id),
          fetchExtraPlans(user.id, date),
        ]);
        const byDay = plan?.slots ? normalizePlanByDay(plan.slots, user.role) : emptyPlanByDay(user.role);
        const built = buildSlots(byDay[dayKey], activity, user.role, extraPlans);
        setSlots(built);
        setUsers({ supervisor, subordinates });
      } catch (e) {
        toast.error(e.message || 'Gagal memuat input harian.');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, user.supervisor_id, date, dayKey]);

  // Tambah rencana tambahan → buat extra_plan, lalu rebuild slot (pertahankan input yang ada).
  async function handleCreateExtraPlan(payload) {
    // Simpan dulu edit yang belum tersimpan agar tidak hilang saat rebuild.
    if (dirty.current) {
      try { await persist(); } catch { /* lanjut */ }
    }
    await createExtraPlan({ userId: user.id, role: user.role, ...payload });
    const [plan, activity, extraPlans] = await Promise.all([
      fetchWeeklyPlan(user.id, currentWeekId()),
      fetchDailyActivity(user.id, date),
      fetchExtraPlans(user.id, date),
    ]);
    const byDay = plan?.slots ? normalizePlanByDay(plan.slots, user.role) : emptyPlanByDay(user.role);
    setSlots(buildSlots(byDay[dayKey], activity, user.role, extraPlans));
    toast.success(payload.date === date ? `Rencana "${payload.label}" ditambahkan ke agenda hari ini.` : `Rencana "${payload.label}" dijadwalkan.`);
  }

  const persist = useCallback(
    async (overrideSlots, opts = {}) => {
      const payloadSlots = applyGating(overrideSlots || slots, date);
      await upsertDailyActivity({
        userId: user.id,
        role: user.role,
        date,
        activities: payloadSlots,
        status: opts.status || 'draft',
        submit: opts.submit,
      });
      setSavedAt(new Date());
      dirty.current = false;
    },
    [slots, user.id, user.role, date]
  );

  useEffect(() => {
    if (loading || !dirty.current) return;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => persist().catch(() => {}), 30000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [slots, loading, persist]);

  function updateSlot(idx, next) {
    dirty.current = true;
    setSlots((prev) => prev.map((s, i) => (i === idx ? next : s)));
  }

  async function handleSaveSlot(idx) {
    const slot = slots[idx];
    const err = validateSlot(slot, formSchemaFor(user.role, slot.time));
    if (err) {
      toast.error(err);
      return;
    }
    setBusySlot(idx);
    try {
      await persist();
      toast.success(`Slot ${slot.time} tersimpan.`);
    } catch (e) {
      toast.error(e.message || 'Gagal menyimpan slot.');
    } finally {
      setBusySlot(null);
    }
  }

  async function handleSubmitScore() {
    const gated = applyGating(slots, date);
    const filled = gated.filter(slotEngaged).length;
    if (filled === 0) {
      toast.error('Belum ada aktivitas terisi.');
      return;
    }
    setBusy('scoring');
    try {
      const daily = await upsertDailyActivity({
        userId: user.id, role: user.role, date, activities: gated, status: 'submitted', submit: true,
      });
      const usersById = Object.fromEntries(
        [users.supervisor, ...users.subordinates].filter(Boolean).map((u) => [u.id, u.name])
      );
      const result = await scoreDailyActivities({ role: user.role, activities: gated, usersById });
      await upsertScore({ userId: user.id, role: user.role, date, dailyActivityId: daily?.id, result });
      await upsertDailyActivity({ userId: user.id, role: user.role, date, activities: gated, status: 'scored' });
      navigate('/score-result', { state: { submitted: true } });
    } catch (e) {
      toast.error(e.message || 'Gagal melakukan penilaian AI.');
    } finally {
      setBusy('');
    }
  }

  // Akhir pekan / tidak ada jadwal
  if (!loading && !dayKey) {
    return (
      <Layout title="Input Aktivitas Hari Ini">
        <div className="card text-center py-12 max-w-md mx-auto">
          <CalendarOff size={36} className="text-text-muted mx-auto mb-3" />
          <p className="font-semibold">Tidak ada jadwal untuk akhir pekan</p>
          <p className="text-sm text-text-secondary mt-1">
            Aktivitas hanya dijadwalkan Senin–Jumat. Silakan kembali pada hari kerja.
          </p>
        </div>
      </Layout>
    );
  }

  const now = nowDate();
  const viewSlots = applyGating(slots, date);

  const openSlots = viewSlots.filter((s) => slotWindowState(date, s.time, s.endTime) === 'open');
  const otherSlots = viewSlots.filter((s) => slotWindowState(date, s.time, s.endTime) !== 'open');
  const engagedSlots = viewSlots.filter(slotEngaged).length;
  const closedSlots = viewSlots.filter((s) => slotWindowState(date, s.time, s.endTime) === 'closed').length;

  return (
    <Layout title="Input Aktivitas Hari Ini">
      {loading ? (
        <DailyInputSkeleton />
      ) : (
        <div className="space-y-6">
          <DailyHeader
            dayKey={dayKey}
            date={date}
            now={now}
            openCount={openSlots.length}
            onAddExtra={() => setShowExtraModal(true)}
            disabled={Boolean(busy)}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <DailyStat label="Slot Terbuka" value={openSlots.length} helper="Slot yang bisa diisi saat ini." icon={Clock3} />
            <DailyStat label="Aktivitas Terisi" value={`${engagedSlots}/${viewSlots.length}`} helper="Slot dengan status, hasil, atau catatan." icon={FileCheck2} />
            <DailyStat label="Slot Tertutup" value={closedSlots} helper="Slot yang sudah melewati waktu input." icon={Layers3} tone={closedSlots > 0 ? 'warning' : 'default'} />
          </div>

          {!isGeminiConfigured && <GeminiNotice />}

          {savedAt && <p className="text-[11px] font-medium text-text-muted">Draft tersimpan - {savedAt.toLocaleTimeString('id-ID')}</p>}

          <div className="hidden">
          <div className="card flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm">
              <span className="font-semibold">{dayLabel(dayKey)}</span>
              <span className="text-text-muted"> · {formatDateID(date)} · {fmtClock(now)}</span>
            </div>
            <span className="text-xs text-text-muted">{openSlots.length} slot terbuka sekarang</span>
          </div>

          {!isGeminiConfigured && (
            <div className="rounded-lg border border-score-2/40 bg-score-2/10 px-4 py-3 text-xs text-score-2">
              Penilaian AI belum aktif (VITE_GEMINI_API_KEY belum diset). Aktivitas tetap dapat
              disimpan, namun skor AI tidak akan tersedia.
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={() => setShowExtraModal(true)} disabled={Boolean(busy)} className="btn-ghost !py-2 text-xs border-hana-teal-500/40 text-hana-teal-700">
              <CalendarPlus size={14} /> Tambah Rencana Tambahan
            </button>
          </div>

          {savedAt && <p className="text-[11px] text-text-muted -mt-1">Draft tersimpan · {savedAt.toLocaleTimeString('id-ID')}</p>}

          </div>

          {/* Slot yang sedang terbuka */}
          {openSlots.length > 0 ? (
            <div className="grid lg:grid-cols-2 gap-4">
              {openSlots.map((slot) => {
                const idx = viewSlots.indexOf(slot);
                const state = slotWindowState(date, slot.time, slot.endTime);
                const { start, end } = slotWindow(date, slot.time, slot.endTime);
                return (
                  <ActivitySlot
                    key={slot.key}
                    slot={slot}
                    userId={user.id}
                    date={date}
                    users={users}
                    formSchema={slot.extra ? [] : formSchemaFor(user.role, slot.time)}
                    windowState={state}
                    startLabel={fmtClock(start)}
                    endLabel={fmtClock(end)}
                    onChange={(next) => updateSlot(idx, next)}
                    onSave={() => handleSaveSlot(idx)}
                    saving={busySlot === idx}
                  />
                );
              })}
            </div>
          ) : (
            <div className="card py-10 text-center">
              <Clock3 size={32} className="mx-auto mb-3 text-text-muted" />
              <p className="font-display text-lg font-extrabold text-ink">Belum ada slot yang terbuka</p>
              <p className="mt-1 text-sm text-text-secondary">Slot berikutnya akan aktif sesuai jadwal waktu hari ini.</p>
            </div>
          )}

          {/* Tombol tampilkan slot lainnya */}
          {otherSlots.length > 0 && (
            <div>
              <button
                onClick={() => setShowOthers((p) => !p)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-hana-border bg-white/80 py-3 text-xs font-bold text-text-secondary shadow-sm transition-colors hover:bg-white hover:text-ink"
              >
                {showOthers ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showOthers ? 'Sembunyikan' : `Tampilkan ${otherSlots.length} slot lainnya`}
              </button>

              {showOthers && (
                <div className="grid lg:grid-cols-2 gap-4 mt-4">
                  {otherSlots.map((slot) => {
                    const idx = viewSlots.indexOf(slot);
                    const state = slotWindowState(date, slot.time, slot.endTime);
                    const { start, end } = slotWindow(date, slot.time, slot.endTime);
                    return (
                      <ActivitySlot
                        key={slot.key}
                        slot={slot}
                        userId={user.id}
                        date={date}
                        users={users}
                        formSchema={slot.extra ? [] : formSchemaFor(user.role, slot.time)}
                        windowState={state}
                        startLabel={fmtClock(start)}
                        endLabel={fmtClock(end)}
                        onChange={(next) => updateSlot(idx, next)}
                        onSave={state !== 'upcoming' ? () => handleSaveSlot(idx) : undefined}
                        saving={busySlot === idx}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Footer: hanya AI scoring */}
          <div className="sticky bottom-4 z-10">
            <button onClick={handleSubmitScore} disabled={Boolean(busy)} className="btn-pink w-full">
              {busy === 'scoring' ? <Spinner size={18} className="text-white" /> : <Brain size={18} />}
              {busy === 'scoring' ? 'AI sedang menilai...' : 'Submit & Minta Penilaian AI'}
            </button>
          </div>
        </div>
      )}

      <ExtraPlanModal
        open={showExtraModal}
        onClose={() => setShowExtraModal(false)}
        role={user.role}
        onCreate={handleCreateExtraPlan}
      />
    </Layout>
  );
}
