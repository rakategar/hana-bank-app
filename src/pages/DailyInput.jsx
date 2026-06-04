import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Save, Brain, CalendarOff, Wand2 } from 'lucide-react';
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

// Bangun slot harian dari jadwal hari tsb. planned_data = rencana (read-only),
// actual_data = hasil aktual terstruktur (mengikuti schema slot yang sama).
function buildSlots(daySchedule, savedActivity) {
  const savedByTime = new Map((savedActivity?.activities || []).map((a) => [a.time, a]));
  return daySchedule.map((p) => {
    const saved = savedByTime.get(p.time) || {};
    return {
      time: p.time,
      label: p.label,
      duration: p.duration ?? DEFAULT_DURATION,
      planned_data: p.data || {},
      actual_data: saved.actual_data || {},
      actual: saved.actual || '',
      activity_status: saved.activity_status || 'not_done',
      notes: saved.notes || '',
      image_path: saved.image_path || null,
      image_url: saved.image_url || null,
    };
  });
}

// Sinkronkan teks `actual` dari actual_data terstruktur (untuk filled-check,
// heatmap, & payload Gemini). Fallback ke actual lama bila tak ada data terstruktur.
function syncActual(s) {
  return { ...s, actual: serializeStructuredData(s.actual_data) || s.actual || '' };
}

// Live: slot tertutup SELALU 'not_done' (tak ada aktivitas tepat waktu), walau diberi
// alasan/foto setelahnya. Demo: time-gating dilonggarkan — hanya slot tertutup & kosong
// yang jadi 'not_done', sehingga data dummy/late entry tetap dihormati.
function applyGating(slots, date) {
  return slots.map((s0) => {
    const s = syncActual(s0);
    const state = slotWindowState(date, s.time, s.duration);
    if (state === 'closed') {
      if (IS_DEMO && s.actual && s.actual.trim()) return s; // demo: hormati late entry
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
  const [confirmDelete, setConfirmDelete] = useState(false);

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
        const built = buildSlots(byDay[dayKey], activity);
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

  async function handleDeleteDay() {
    setBusy('deleting');
    setError('');
    try {
      await deleteDailyData(user.id, date);
      const plan = await fetchWeeklyPlan(user.id, currentWeekId());
      const byDay = plan?.slots ? normalizePlanByDay(plan.slots, user.role) : emptyPlanByDay(user.role);
      setSlots(buildSlots(byDay[dayKey], null));
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

  async function handleSaveDraft() {
    setBusy('saving');
    try { await persist(); } catch (e) { setError(e.message || 'Gagal menyimpan draft.'); } finally { setBusy(''); }
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
  const openCount = viewSlots.filter((s) => slotWindowState(date, s.time, s.duration) === 'open').length;

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
            <span className="text-xs text-text-muted">{openCount} slot terbuka sekarang</span>
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

          {savedAt && <p className="text-[11px] text-text-muted -mt-1">Draft tersimpan otomatis · {savedAt.toLocaleTimeString('id-ID')}</p>}

          <div className="grid lg:grid-cols-2 gap-4">
            {viewSlots.map((slot, idx) => {
              // Demo: semua slot bebas diisi (tanpa penguncian waktu).
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
                />
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sticky bottom-4">
            <button onClick={handleSaveDraft} disabled={Boolean(busy)} className="btn-ghost">
              <Save size={16} /> Simpan Draft
            </button>
            <button onClick={handleSubmitScore} disabled={Boolean(busy)} className="btn-pink">
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
