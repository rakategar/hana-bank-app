import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarOff, CalendarPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUnsavedWarning } from '../hooks/useUnsavedWarning';
import Layout from '../components/Layout';
import ActivitySlot from '../components/ActivitySlot';
import ExtraPlanModal from '../components/ExtraPlanModal';
import { FullSpinner, ErrorBox, Spinner, Toast } from '../components/ui';
import { emptyPlanByDay, normalizePlanByDay, formSchemaFor } from '../constants/timeSlots';
import {
  fetchWeeklyPlan,
  fetchDailyActivity,
  upsertDailyActivity,
  upsertScore,
  fetchAllUsers,
  fetchExtraPlans,
  createExtraPlan,
} from '../lib/db';
import { scoreDailyActivities, isAiConfigured } from '../lib/ai';
import {
  todayISO, formatDateISO, currentWeekId, dayKeyFromDate, dayLabel, formatDateID,
  slotWindow, fmtClock, nowDate, DEFAULT_DURATION,
  serializeStructuredData, isStructuredFilled, getDailyInputGraceDates,
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
    // Pre-populate hanya untuk FA — FWSS/BM tidak pakai weekly plan
    if (role && role === 'FA') {
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

// Label singkat untuk tab (mis. "8 Jun", "9 Jun")
function shortDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const m = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return `${d.getDate()} ${m[d.getMonth()]}`;
}

function applyGating(slots, date) {
  const today = todayISO();
  const graceDates = getDailyInputGraceDates(nowDate());
  if (date >= today || graceDates.includes(date)) return slots.map(syncActual);
  // Hari lampau: kunci status, biarkan notes bisa diisi lewat save
  return slots.map((s0) => {
    const s = syncActual(s0);
    if (s.activity_status === 'done' || s.activity_status === 'partial') return s;
    return { ...s, activity_status: 'not_done' };
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

export default function DailyInput() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = todayISO();
  const [selectedDate, setSelectedDate] = useState(today);
  const graceDates = getDailyInputGraceDates(nowDate());
  const allSelectableDates = [today, ...graceDates];
  const dayKey = dayKeyFromDate(new Date(selectedDate + 'T12:00:00'));

  const [slots, setSlots] = useState([]);
  const [users, setUsers] = useState({ allSupervisors: [], allSubordinates: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState(null);
  const [busy, setBusy] = useState('');
  const [busySlot, setBusySlot] = useState(null);
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [toast, setToast] = useState(null);

  const autoSaveTimer = useRef(null);
  const dirty = useRef(false);
  const [isDirty, setIsDirty] = useState(false);

  useUnsavedWarning(isDirty);

  useEffect(() => {
    setLoading(true);
    setSlots([]);
    setError('');
    if (!dayKey) { setLoading(false); return; }
    (async () => {
      try {
        const noWeeklyPlan = user.role === 'FWSS' || user.role === 'BM';
        const SUPERVISOR_ROLES = { FA: ['FWSS','BM','RH'], FWSS: ['BM','RH'], BM: ['RH'] };
        const SUBORDINATE_ROLES = { FWSS: ['FA','BM'], BM: ['FWSS','FA'], RH: ['BM','FWSS','FA'] };
        const weekId = currentWeekId(new Date(selectedDate + 'T12:00:00'));
        const [plan, activity, allUsersList, extraPlans] = await Promise.all([
          noWeeklyPlan ? Promise.resolve(null) : fetchWeeklyPlan(user.id, weekId),
          fetchDailyActivity(user.id, selectedDate),
          fetchAllUsers(),
          fetchExtraPlans(user.id, selectedDate),
        ]);
        const byDay = plan?.slots ? normalizePlanByDay(plan.slots, user.role) : emptyPlanByDay(user.role);
        const built = buildSlots(byDay[dayKey], activity, user.role, extraPlans);
        setSlots(built);
        const allSupervisors = allUsersList.filter((u) => SUPERVISOR_ROLES[user.role]?.includes(u.role));
        const allSubordinates = allUsersList.filter((u) => SUBORDINATE_ROLES[user.role]?.includes(u.role));
        setUsers({ allSupervisors, allSubordinates });
      } catch (e) {
        setError(e.message || 'Gagal memuat input harian.');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, selectedDate]);

  // Tambah rencana tambahan → buat extra_plan, lalu rebuild slot (pertahankan input yang ada).
  async function handleCreateExtraPlan(payload) {
    // Simpan dulu edit yang belum tersimpan agar tidak hilang saat rebuild.
    if (dirty.current) {
      try { await persist(); } catch { /* lanjut */ }
    }
    await createExtraPlan({ userId: user.id, role: user.role, ...payload });
    const noWeeklyPlan = user.role === 'FWSS' || user.role === 'BM';
    const weekId = currentWeekId(new Date(selectedDate + 'T12:00:00'));
    const [plan, activity, extraPlans] = await Promise.all([
      noWeeklyPlan ? Promise.resolve(null) : fetchWeeklyPlan(user.id, weekId),
      fetchDailyActivity(user.id, selectedDate),
      fetchExtraPlans(user.id, selectedDate),
    ]);
    const byDay = plan?.slots ? normalizePlanByDay(plan.slots, user.role) : emptyPlanByDay(user.role);
    setSlots(buildSlots(byDay[dayKey], activity, user.role, extraPlans));
    setToast({
      type: 'success',
      message: payload.date === selectedDate ? `Rencana "${payload.label}" ditambahkan ke agenda hari ini.` : `Rencana "${payload.label}" dijadwalkan.`,
    });
  }

  const persist = useCallback(
    async (overrideSlots, opts = {}) => {
      const payloadSlots = applyGating(overrideSlots || slots, selectedDate);
      await upsertDailyActivity({
        userId: user.id,
        role: user.role,
        date: selectedDate,
        activities: payloadSlots,
        status: opts.status || 'draft',
        submit: opts.submit,
      });
      setSavedAt(new Date());
      dirty.current = false;
      setIsDirty(false);
    },
    [slots, user.id, user.role, selectedDate]
  );

  useEffect(() => {
    if (loading || !dirty.current) return;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => persist().catch(() => {}), 5000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [slots, loading, persist]);

  function updateSlot(idx, next) {
    dirty.current = true;
    setIsDirty(true);
    setSlots((prev) => prev.map((s, i) => (i === idx ? next : s)));
  }

  async function handleSaveSlot(idx) {
    const slot = slots[idx];
    const err = validateSlot(slot, formSchemaFor(user.role, slot.time));
    if (err) {
      setToast({ type: 'error', message: err });
      return;
    }
    setBusySlot(idx);
    setError('');
    try {
      await persist();
      setToast({ type: 'success', message: `Slot ${slot.time} tersimpan.` });
    } catch (e) {
      setToast({ type: 'error', message: e.message || 'Gagal menyimpan slot.' });
    } finally {
      setBusySlot(null);
    }
  }

  async function handleSubmitScore() {
    const gated = applyGating(slots, selectedDate);
    const filled = gated.filter(slotEngaged).length;
    if (filled === 0) {
      setError('Belum ada aktivitas terisi.');
      return;
    }
    setBusy('scoring');
    setError('');
    try {
      const daily = await upsertDailyActivity({
        userId: user.id, role: user.role, date: selectedDate, activities: gated, status: 'submitted', submit: true,
      });
      const usersById = Object.fromEntries(
        [...(users.allSupervisors || []), ...(users.allSubordinates || [])].filter(Boolean).map((u) => [u.id, u.name])
      );
      const result = await scoreDailyActivities({ role: user.role, activities: gated, usersById });
      await upsertScore({ userId: user.id, role: user.role, date: selectedDate, dailyActivityId: daily?.id, result });
      await upsertDailyActivity({ userId: user.id, role: user.role, date: selectedDate, activities: gated, status: 'scored' });
      navigate('/score-result', { state: { submitted: true } });
    } catch (e) {
      setError(e.message || 'Gagal melakukan penilaian AI.');
    } finally {
      setBusy('');
    }
  }

  const hasGracePeriod = graceDates.length > 0;
  const isToday = selectedDate === today;
  const pageTitle = isToday ? 'Input Aktivitas Hari Ini' : `Input Aktivitas ${shortDate(selectedDate)}`;

  // Akhir pekan / tidak ada jadwal
  if (!loading && !dayKey) {
    return (
      <Layout title={pageTitle} back={true}>
        {hasGracePeriod && (
          <div className="flex gap-1 p-1 bg-elevated rounded-lg self-start mb-4">
            {allSelectableDates.map((d) => (
              <button key={d} onClick={() => setSelectedDate(d)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${selectedDate === d ? 'bg-white shadow text-ink' : 'text-text-secondary hover:text-ink'}`}>
                {d === today ? 'Hari Ini' : shortDate(d)}
              </button>
            ))}
          </div>
        )}
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
  const viewSlots = applyGating(slots, selectedDate);
  const hidePlan = user.role === 'FWSS' || user.role === 'BM';

  return (
    <Layout title={pageTitle} back={true}>
      {loading ? (
        <FullSpinner label="Memuat aktivitas..." />
      ) : (
        <div className="space-y-4">
          {error && <ErrorBox>{error}</ErrorBox>}

          {/* Tab pilih tanggal — hanya tampil saat ada grace period */}
          {hasGracePeriod && (
            <div className="flex gap-1 p-1 bg-elevated rounded-lg self-start">
              {allSelectableDates.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDate(d)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${selectedDate === d ? 'bg-white shadow text-ink' : 'text-text-secondary hover:text-ink'}`}
                >
                  {d === today ? 'Hari Ini' : shortDate(d)}
                </button>
              ))}
            </div>
          )}

          <div className="card flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm">
              <span className="font-semibold">{dayLabel(dayKey)}</span>
              <span className="text-text-muted"> · {formatDateID(selectedDate)} · {isToday ? fmtClock(now) : ''}</span>
            </div>
            <span className="text-xs text-text-muted">
              {`${viewSlots.length} slot aktif`}
            </span>
          </div>

          {!isAiConfigured && (
            <div className="rounded-lg border border-score-2/40 bg-score-2/10 px-4 py-3 text-xs text-score-2">
              Penilaian AI dinonaktifkan (VITE_AI_ENABLED=false). Aktivitas tetap dapat
              disimpan, namun skor AI tidak akan tersedia.
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={() => setShowExtraModal(true)} disabled={Boolean(busy)} className="btn-ghost !py-2 text-xs border-hana-teal-500/40 text-hana-teal-700">
              <CalendarPlus size={14} /> Tambah Rencana Tambahan
            </button>
          </div>

          {savedAt && <p className="text-[11px] text-text-muted -mt-1">Draft tersimpan · {savedAt.toLocaleTimeString('id-ID')}</p>}

          {/* Slot aktif hari ini */}
          {viewSlots.length > 0 ? (
            <div className="grid lg:grid-cols-2 gap-4">
              {viewSlots.map((slot) => {
                const idx = viewSlots.indexOf(slot);
                const { start, end } = slotWindow(selectedDate, slot.time, slot.endTime);
                // Grace dates (hari lampau dalam minggu yg sama): semua slot open agar bisa diisi penuh.
                // Hari ini: hitung dari waktu nyata.
                const windowState = !isToday
                  ? 'open'
                  : now < start ? 'upcoming' : now <= end ? 'open' : 'closed';
                return (
                  <ActivitySlot
                    key={slot.key}
                    slot={slot}
                    userId={user.id}
                    date={selectedDate}
                    users={users}
                    formSchema={slot.extra ? [] : formSchemaFor(user.role, slot.time)}
                    windowState={windowState}
                    startLabel={fmtClock(start)}
                    endLabel={fmtClock(end)}
                    onChange={(next) => updateSlot(idx, next)}
                    onSave={() => handleSaveSlot(idx)}
                    saving={busySlot === idx}
                    hidePlan={hidePlan}
                  />
                );
              })}
            </div>
          ) : (
            <div className="card text-center py-8 text-text-muted text-sm">
              Input hari sebelumnya sudah dikunci. Anda masih dapat menambahkan alasan di bawah.
            </div>
          )}

          {/* Footer: hanya AI scoring */}
          <div className="sticky bottom-4">
            <button onClick={handleSubmitScore} disabled={Boolean(busy)} className="btn-pink w-full">
              {busy === 'scoring' && <Spinner size={18} className="text-white" />}
              {busy === 'scoring' ? 'AI sedang menilai...' : 'Submit'}
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

      <Toast toast={toast} onClose={() => setToast(null)} />
    </Layout>
  );
}
