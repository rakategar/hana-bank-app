import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, CalendarOff, CalendarPlus, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
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

export default function DailyInput() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const date = todayISO();
  const dayKey = dayKeyFromDate(nowDate());

  const [slots, setSlots] = useState([]);
  const [users, setUsers] = useState({ supervisor: null, subordinates: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState(null);
  const [busy, setBusy] = useState('');
  const [busySlot, setBusySlot] = useState(null);
  const [showOthers, setShowOthers] = useState(false);
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [toast, setToast] = useState(null);

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
        setError(e.message || 'Gagal memuat input harian.');
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
    setToast({
      type: 'success',
      message: payload.date === date ? `Rencana "${payload.label}" ditambahkan ke agenda hari ini.` : `Rencana "${payload.label}" dijadwalkan.`,
    });
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
    const gated = applyGating(slots, date);
    const filled = gated.filter(slotEngaged).length;
    if (filled === 0) {
      setError('Belum ada aktivitas terisi.');
      return;
    }
    setBusy('scoring');
    setError('');
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
      setError(e.message || 'Gagal melakukan penilaian AI.');
    } finally {
      setBusy('');
    }
  }

  // Akhir pekan / tidak ada jadwal
  if (!loading && !dayKey) {
    return (
      <Layout title="Input Aktivitas Hari Ini" back={true}>
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

  return (
    <Layout title="Input Aktivitas Hari Ini" back={true}>
      {loading ? (
        <FullSpinner label="Memuat aktivitas..." />
      ) : (
        <div className="space-y-4">
          {error && <ErrorBox>{error}</ErrorBox>}

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
            <div className="card text-center py-8 text-text-muted text-sm">
              Belum ada slot yang terbuka sekarang.
            </div>
          )}

          {/* Tombol tampilkan slot lainnya */}
          {otherSlots.length > 0 && (
            <div>
              <button
                onClick={() => setShowOthers((p) => !p)}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-text-secondary border border-hana-border rounded-lg hover:bg-elevated transition-colors"
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
          <div className="sticky bottom-4">
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

      <Toast toast={toast} onClose={() => setToast(null)} />
    </Layout>
  );
}
