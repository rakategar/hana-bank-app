import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Brain, CalendarOff, Wand2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import ActivitySlot from '../components/ActivitySlot';
import { Modal, FullSpinner, ErrorBox, Spinner } from '../components/ui';
import { emptyPlanByDay, normalizePlanByDay, formSchemaFor } from '../constants/timeSlots';
import {
  fetchWeeklyPlan,
  fetchDailyActivity,
  upsertDailyActivity,
  deleteDailyData,
  upsertScore,
  fetchSubordinates,
  fetchUserMaybe,
} from '../lib/db';
import { scoreDailyActivities, isGeminiConfigured } from '../lib/gemini';
import { generateDummyActivities, generateDummyScores } from '../lib/dummyData';
import { IS_DEMO } from '../lib/appMode';
import {
  todayISO, currentWeekId, dayKeyFromDate, dayLabel, formatDateID,
  slotWindowState, slotWindow, fmtClock, nowDate, DEFAULT_DURATION,
  serializeStructuredData,
} from '../lib/utils';

// Bangun slot harian dari jadwal hari tsb.
// Pre-inisialisasi actual_data untuk list fields dengan resultSchema dari planned_data.
function buildSlots(daySchedule, savedActivity, role) {
  const savedByTime = new Map((savedActivity?.activities || []).map((a) => [a.time, a]));
  return daySchedule.map((p) => {
    const saved = savedByTime.get(p.time) || {};
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
}

function syncActual(s) {
  return { ...s, actual: serializeStructuredData(s.actual_data) || s.actual || '' };
}

function applyGating(slots, date) {
  return slots.map((s0) => {
    const s = syncActual(s0);
    const state = slotWindowState(date, s.time, s.duration);
    if (state === 'closed') {
      if (IS_DEMO && s.actual && s.actual.trim()) return s;
      return { ...s, activity_status: 'not_done' };
    }
    return s;
  });
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
  const [hasData, setHasData] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [busy, setBusy] = useState('');
  const [busySlot, setBusySlot] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showOthers, setShowOthers] = useState(false);

  const autoSaveTimer = useRef(null);
  const dirty = useRef(false);

  useEffect(() => {
    if (!dayKey) { setLoading(false); return; }
    (async () => {
      try {
        const [plan, activity, supervisor, subordinates] = await Promise.all([
          fetchWeeklyPlan(user.id, currentWeekId()),
          fetchDailyActivity(user.id, date),
          user.supervisor_id ? fetchUserMaybe(user.supervisor_id) : Promise.resolve(null),
          fetchSubordinates(user.id),
        ]);
        const byDay = plan?.slots ? normalizePlanByDay(plan.slots, user.role) : emptyPlanByDay(user.role);
        const built = buildSlots(byDay[dayKey], activity, user.role);
        setSlots(built);
        setUsers({ supervisor, subordinates });
        if (activity?.activities?.length) setHasData(true);
      } catch (e) {
        setError(e.message || 'Gagal memuat input harian.');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, user.supervisor_id, date, dayKey]);

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
      setHasData(true);
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
    setBusySlot(idx);
    setError('');
    try {
      await persist();
    } catch (e) {
      setError(e.message || 'Gagal menyimpan slot.');
    } finally {
      setBusySlot(null);
    }
  }

  async function handleDeleteDay() {
    setBusy('deleting');
    setError('');
    try {
      await deleteDailyData(user.id, date);
      const plan = await fetchWeeklyPlan(user.id, currentWeekId());
      const byDay = plan?.slots ? normalizePlanByDay(plan.slots, user.role) : emptyPlanByDay(user.role);
      setSlots(buildSlots(byDay[dayKey], null, user.role));
      setHasData(false);
      setSavedAt(null);
    } catch (e) {
      setError(e.message || 'Gagal menghapus data.');
    } finally {
      setBusy('');
      setConfirmDelete(false);
    }
  }

  // Mode demo: isi semua slot dengan aktivitas + skor dummy
  async function handleAddDummy() {
    setBusy('dummy');
    setError('');
    try {
      const activities = generateDummyActivities(user.role);
      const metaByTime = new Map(slots.map((s) => [s.time, s]));
      const withMeta = activities.map((a) => {
        const m = metaByTime.get(a.time) || {};
        return {
          ...a,
          planned_data: m.planned_data || {},
          actual_data: m.actual_data || {},
          duration: m.duration ?? DEFAULT_DURATION,
        };
      });
      setSlots(withMeta);
      await upsertDailyActivity({
        userId: user.id, role: user.role, date, activities: withMeta, status: 'scored', isDummy: true,
      });
      const result = generateDummyScores(user.role, withMeta);
      await upsertScore({ userId: user.id, role: user.role, date, result, isDummy: true });
      setHasData(true);
    } catch (e) {
      setError(e.message || 'Gagal menambah dummy.');
    } finally {
      setBusy('');
    }
  }

  async function handleSubmitScore() {
    const gated = applyGating(slots, date);
    const filled = gated.filter((s) => s.actual && s.actual.trim()).length;
    if (filled === 0) {
      setError('Belum ada aktivitas terisi pada slot yang terbuka.');
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

  // Demo: semua slot diperlakukan sebagai open (tanpa pemisahan)
  const openSlots = IS_DEMO
    ? viewSlots
    : viewSlots.filter((s) => slotWindowState(date, s.time, s.duration) === 'open');
  const otherSlots = IS_DEMO
    ? []
    : viewSlots.filter((s) => slotWindowState(date, s.time, s.duration) !== 'open');

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
            {IS_DEMO && (
              <button onClick={handleAddDummy} disabled={Boolean(busy)} className="btn-ghost !py-2 text-xs border-hana-teal-500/40 text-hana-teal-700">
                {busy === 'dummy' ? <Spinner size={14} /> : <Wand2 size={14} />} Tambah Dummy
              </button>
            )}
            {hasData && (
              <button onClick={() => setConfirmDelete(true)} disabled={Boolean(busy)} className="btn-ghost !py-2 text-xs border-score-1/40 text-score-1">
                <Trash2 size={14} /> Hapus Data Hari Ini
              </button>
            )}
          </div>

          {savedAt && <p className="text-[11px] text-text-muted -mt-1">Draft tersimpan · {savedAt.toLocaleTimeString('id-ID')}</p>}

          {/* Slot yang sedang terbuka */}
          {openSlots.length > 0 ? (
            <div className="grid lg:grid-cols-2 gap-4">
              {openSlots.map((slot) => {
                const idx = viewSlots.indexOf(slot);
                const state = IS_DEMO ? 'open' : slotWindowState(date, slot.time, slot.duration);
                const { start, end } = slotWindow(date, slot.time, slot.duration);
                return (
                  <ActivitySlot
                    key={slot.time}
                    slot={slot}
                    userId={user.id}
                    date={date}
                    users={users}
                    formSchema={formSchemaFor(user.role, slot.time)}
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
                    const state = slotWindowState(date, slot.time, slot.duration);
                    const { start, end } = slotWindow(date, slot.time, slot.duration);
                    return (
                      <ActivitySlot
                        key={slot.time}
                        slot={slot}
                        userId={user.id}
                        date={date}
                        users={users}
                        formSchema={formSchemaFor(user.role, slot.time)}
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

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Hapus Data Hari Ini?"
        footer={
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setConfirmDelete(false)} className="btn-ghost">Batal</button>
            <button onClick={handleDeleteDay} disabled={busy === 'deleting'} className="btn-pink">
              {busy === 'deleting' ? <Spinner size={16} className="text-white" /> : <Trash2 size={16} />} Hapus
            </button>
          </div>
        }
      >
        <p className="text-sm text-text-secondary">
          Menghapus aktivitas harian <b>dan</b> skor AI hari ini. Rencana mingguan tidak terpengaruh.
        </p>
      </Modal>
    </Layout>
  );
}
