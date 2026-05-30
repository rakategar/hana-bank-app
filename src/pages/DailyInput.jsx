import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Wand2, Save, Brain, CalendarOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDemoTime } from '../contexts/DemoTimeContext';
import Layout from '../components/Layout';
import ActivitySlot from '../components/ActivitySlot';
import { Modal, FullSpinner, ErrorBox, Spinner } from '../components/ui';
import { emptyPlanByDay, normalizePlanByDay } from '../constants/timeSlots';
import {
  fetchWeeklyPlan,
  fetchDailyActivity,
  upsertDailyActivity,
  deleteDailyData,
  upsertScore,
} from '../lib/db';
import { generateDummyActivities, generateDummyScores } from '../lib/dummyData';
import { scoreDailyActivities, isGeminiConfigured } from '../lib/gemini';
import {
  todayISO, currentWeekId, dayKeyFromDate, dayLabel, formatDateID,
  slotWindowState, slotWindow, fmtClock,
} from '../lib/utils';

// Bangun slot harian dari jadwal hari tsb (planned + duration)
function buildSlots(daySchedule, savedActivity) {
  const savedByTime = new Map((savedActivity?.activities || []).map((a) => [a.time, a]));
  return daySchedule.map((p) => {
    const saved = savedByTime.get(p.time) || {};
    const plannedParts = [p.prospect, p.location, p.objective].filter(Boolean).join(' · ');
    return {
      time: p.time,
      label: p.label,
      planned: plannedParts,
      duration: p.duration ?? 45,
      actual: saved.actual || '',
      activity_status: saved.activity_status || 'not_done',
      notes: saved.notes || '',
      image_path: saved.image_path || null,
      image_url: saved.image_url || null,
    };
  });
}

// Tutup otomatis slot yang sudah terlewat & kosong → not_done
function applyGating(slots, date, now) {
  return slots.map((s) => {
    const state = slotWindowState(date, s.time, s.duration, now);
    if (state === 'closed' && !(s.actual && s.actual.trim())) {
      return { ...s, activity_status: 'not_done' };
    }
    return s;
  });
}

export default function DailyInput() {
  const { user } = useAuth();
  const { now } = useDemoTime();
  const navigate = useNavigate();
  const date = todayISO();
  const dayKey = dayKeyFromDate(now);

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasData, setHasData] = useState(false);
  const [isDummy, setIsDummy] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [busy, setBusy] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const autoSaveTimer = useRef(null);
  const dirty = useRef(false);

  useEffect(() => {
    if (!dayKey) { setLoading(false); return; }
    (async () => {
      try {
        const [plan, activity] = await Promise.all([
          fetchWeeklyPlan(user.id, currentWeekId()),
          fetchDailyActivity(user.id, date),
        ]);
        const byDay = plan?.slots ? normalizePlanByDay(plan.slots, user.role) : emptyPlanByDay(user.role);
        const built = buildSlots(byDay[dayKey], activity);
        setSlots(built);
        if (activity?.activities?.length) {
          setHasData(true);
          setIsDummy(Boolean(activity.is_dummy));
        }
      } catch (e) {
        setError(e.message || 'Gagal memuat input harian.');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, date, dayKey]);

  const persist = useCallback(
    async (overrideSlots, opts = {}) => {
      const payloadSlots = applyGating(overrideSlots || slots, date, now);
      await upsertDailyActivity({
        userId: user.id,
        role: user.role,
        date,
        activities: payloadSlots,
        status: opts.status || 'draft',
        isDummy: opts.isDummy ?? isDummy,
        submit: opts.submit,
      });
      setSavedAt(new Date());
      setHasData(true);
      dirty.current = false;
    },
    [slots, user.id, user.role, date, isDummy, now]
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

  async function handleAddDummy() {
    setBusy('dummy');
    setError('');
    try {
      const activities = generateDummyActivities(user.role);
      const metaByTime = new Map(slots.map((s) => [s.time, s]));
      const withMeta = activities.map((a) => {
        const m = metaByTime.get(a.time) || {};
        return { ...a, planned: m.planned || '', duration: m.duration ?? 45 };
      });
      setSlots(withMeta);
      setIsDummy(true);
      await persist(withMeta, { status: 'scored', isDummy: true });
      const result = generateDummyScores(user.role, withMeta);
      await upsertScore({ userId: user.id, role: user.role, date, result, isDummy: true });
    } catch (e) {
      setError(e.message || 'Gagal menambah dummy.');
    } finally {
      setBusy('');
    }
  }

  async function handleDeleteDummy() {
    setBusy('deleting');
    setError('');
    try {
      await deleteDailyData(user.id, date);
      const plan = await fetchWeeklyPlan(user.id, currentWeekId());
      const byDay = plan?.slots ? normalizePlanByDay(plan.slots, user.role) : emptyPlanByDay(user.role);
      setSlots(buildSlots(byDay[dayKey], null));
      setHasData(false);
      setIsDummy(false);
      setSavedAt(null);
    } catch (e) {
      setError(e.message || 'Gagal menghapus data.');
    } finally {
      setBusy('');
      setConfirmDelete(false);
    }
  }

  async function handleSubmitScore() {
    const gated = applyGating(slots, date, now);
    const filled = gated.filter((s) => s.actual && s.actual.trim()).length;
    if (filled === 0) {
      setError('Belum ada aktivitas terisi pada slot yang terbuka.');
      return;
    }
    setBusy('scoring');
    setError('');
    try {
      const daily = await upsertDailyActivity({
        userId: user.id, role: user.role, date, activities: gated, status: 'submitted', isDummy: false, submit: true,
      });
      setIsDummy(false);
      const result = await scoreDailyActivities({ role: user.role, activities: gated });
      await upsertScore({ userId: user.id, role: user.role, date, dailyActivityId: daily?.id, result, isDummy: false });
      await upsertDailyActivity({ userId: user.id, role: user.role, date, activities: gated, status: 'scored', isDummy: false });
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

  // Weekend / tidak ada jadwal
  if (!loading && !dayKey) {
    return (
      <Layout title="Input Aktivitas Hari Ini" back={true}>
        <div className="card text-center py-12 max-w-md mx-auto">
          <CalendarOff size={36} className="text-text-muted mx-auto mb-3" />
          <p className="font-semibold">Tidak ada jadwal untuk akhir pekan</p>
          <p className="text-sm text-text-secondary mt-1">
            Aktivitas hanya dijadwalkan Senin–Jumat. Ubah <b>Waktu Demo</b> (ikon jam di atas) ke hari kerja.
          </p>
        </div>
      </Layout>
    );
  }

  const viewSlots = applyGating(slots, date, now);
  const openCount = viewSlots.filter((s) => slotWindowState(date, s.time, s.duration, now) === 'open').length;

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
              Gemini API belum dikonfigurasi (VITE_GEMINI_API_KEY). Gunakan tombol "Tambah Dummy" untuk demo skor.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleAddDummy} disabled={Boolean(busy)} className="btn-ghost border-hana-teal-500/40 text-hana-teal-700">
              {busy === 'dummy' ? <Spinner size={16} /> : <Wand2 size={16} />} Tambah Dummy
            </button>
            <button onClick={() => setConfirmDelete(true)} disabled={Boolean(busy) || !hasData} className="btn-ghost border-score-1/40 text-score-1">
              <Trash2 size={16} /> Hapus Dummy
            </button>
          </div>

          {isDummy && <p className="text-[11px] text-score-2 -mt-1">⚠ Data saat ini adalah dummy (is_dummy = true).</p>}
          {savedAt && <p className="text-[11px] text-text-muted -mt-1">Draft tersimpan otomatis · {savedAt.toLocaleTimeString('id-ID')}</p>}

          <div className="grid lg:grid-cols-2 gap-4">
            {viewSlots.map((slot, idx) => {
              const state = slotWindowState(date, slot.time, slot.duration, now);
              const { start, end } = slotWindow(date, slot.time, slot.duration);
              return (
                <ActivitySlot
                  key={slot.time}
                  slot={slot}
                  userId={user.id}
                  date={date}
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
            <button onClick={handleDeleteDummy} disabled={busy === 'deleting'} className="btn-pink">
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
