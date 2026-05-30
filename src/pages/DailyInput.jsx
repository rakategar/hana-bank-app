import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Wand2, Save, Brain } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import ActivitySlot from '../components/ActivitySlot';
import { Modal, FullSpinner, ErrorBox, Spinner } from '../components/ui';
import { slotsForRole } from '../constants/timeSlots';
import {
  fetchWeeklyPlan,
  fetchDailyActivity,
  fetchScore,
  upsertDailyActivity,
  deleteDailyData,
  upsertScore,
} from '../lib/db';
import { generateDummyActivities, generateDummyScores } from '../lib/dummyData';
import { scoreDailyActivities, isGeminiConfigured } from '../lib/gemini';
import { todayISO, currentWeekId } from '../lib/utils';

function buildEmptySlots(role, plan) {
  const planByTime = new Map((plan?.slots || []).map((s) => [s.time, s]));
  return slotsForRole(role).map((t) => {
    const p = planByTime.get(t.time);
    const plannedParts = p
      ? [p.prospect, p.location, p.objective].filter(Boolean).join(' · ')
      : '';
    return {
      time: t.time,
      label: t.label,
      planned: plannedParts,
      actual: '',
      activity_status: 'not_done',
      notes: '',
      image_path: null,
      image_url: null,
    };
  });
}

export default function DailyInput() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const date = todayISO();

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasData, setHasData] = useState(false);
  const [isDummy, setIsDummy] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [busy, setBusy] = useState(''); // '', 'dummy', 'scoring', 'deleting'
  const [confirmDelete, setConfirmDelete] = useState(false);

  const autoSaveTimer = useRef(null);
  const dirty = useRef(false);

  // Load awal
  useEffect(() => {
    (async () => {
      try {
        const [plan, activity] = await Promise.all([
          fetchWeeklyPlan(user.id, currentWeekId()),
          fetchDailyActivity(user.id, date),
        ]);
        const empty = buildEmptySlots(user.role, plan);
        if (activity?.activities?.length) {
          const byTime = new Map(activity.activities.map((a) => [a.time, a]));
          setSlots(empty.map((e) => ({ ...e, ...(byTime.get(e.time) || {}), planned: e.planned })));
          setHasData(true);
          setIsDummy(Boolean(activity.is_dummy));
        } else {
          setSlots(empty);
        }
      } catch (e) {
        setError(e.message || 'Gagal memuat input harian.');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  // Auto-save draft tiap 30 detik (debounced saat ada perubahan)
  const persist = useCallback(
    async (overrideSlots, opts = {}) => {
      const payloadSlots = overrideSlots || slots;
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
    [slots, user.id, user.role, date, isDummy]
  );

  useEffect(() => {
    if (loading) return;
    if (!dirty.current) return;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      persist().catch(() => {});
    }, 30000);
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
      // pertahankan planned context
      const planByTime = new Map(slots.map((s) => [s.time, s.planned]));
      const withPlan = activities.map((a) => ({ ...a, planned: planByTime.get(a.time) || '' }));
      setSlots(withPlan);
      setIsDummy(true);
      await persist(withPlan, { status: 'scored', isDummy: true });

      // generate & simpan ai_scores dummy
      const result = generateDummyScores(user.role, withPlan);
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
      setSlots(buildEmptySlots(user.role, plan));
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
    const filled = slots.filter((s) => s.actual && s.actual.trim()).length;
    if (filled === 0) {
      setError('Isi minimal satu aktivitas sebelum minta penilaian AI.');
      return;
    }
    setBusy('scoring');
    setError('');
    try {
      const daily = await upsertDailyActivity({
        userId: user.id,
        role: user.role,
        date,
        activities: slots,
        status: 'submitted',
        isDummy: false,
        submit: true,
      });
      setIsDummy(false);

      const result = await scoreDailyActivities({ role: user.role, activities: slots });
      await upsertScore({
        userId: user.id,
        role: user.role,
        date,
        dailyActivityId: daily?.id,
        result,
        isDummy: false,
      });
      await upsertDailyActivity({
        userId: user.id,
        role: user.role,
        date,
        activities: slots,
        status: 'scored',
        isDummy: false,
      });
      navigate('/score-result', { state: { result, role: user.role } });
    } catch (e) {
      setError(e.message || 'Gagal melakukan penilaian AI.');
    } finally {
      setBusy('');
    }
  }

  async function handleSaveDraft() {
    setBusy('saving');
    try {
      await persist();
    } catch (e) {
      setError(e.message || 'Gagal menyimpan draft.');
    } finally {
      setBusy('');
    }
  }

  return (
    <Layout title="Input Aktivitas Hari Ini" back={true}>
      {loading ? (
        <FullSpinner label="Memuat aktivitas..." />
      ) : (
        <div className="space-y-4">
          {error && <ErrorBox>{error}</ErrorBox>}

          {!isGeminiConfigured && (
            <div className="rounded-lg border border-score-2/40 bg-score-2/10 px-4 py-3 text-xs text-score-2">
              Gemini API belum dikonfigurasi (VITE_GEMINI_API_KEY). Gunakan tombol "Tambah Dummy" untuk demo skor.
            </div>
          )}

          {/* Utility buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleAddDummy} disabled={Boolean(busy)} className="btn-ghost border-hana-teal-500/40 text-hana-teal-500">
              {busy === 'dummy' ? <Spinner size={16} /> : <Wand2 size={16} />} Tambah Dummy
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={Boolean(busy) || !hasData}
              className="btn-ghost border-score-1/40 text-score-1"
            >
              <Trash2 size={16} /> Hapus Dummy
            </button>
          </div>

          {isDummy && (
            <p className="text-[11px] text-score-2 -mt-1">⚠ Data saat ini adalah dummy (is_dummy = true).</p>
          )}
          {savedAt && (
            <p className="text-[11px] text-text-muted -mt-1">
              Draft tersimpan otomatis · {savedAt.toLocaleTimeString('id-ID')}
            </p>
          )}

          {/* Timeline slots */}
          <div className="space-y-3">
            {slots.map((slot, idx) => (
              <ActivitySlot
                key={slot.time}
                slot={slot}
                userId={user.id}
                date={date}
                onChange={(next) => updateSlot(idx, next)}
              />
            ))}
          </div>

          {/* Submit actions */}
          <div className="grid grid-cols-1 gap-3 sticky bottom-4">
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
          Tindakan ini akan menghapus aktivitas harian <b>dan</b> skor AI hari ini. Rencana mingguan tidak terpengaruh.
        </p>
      </Modal>
    </Layout>
  );
}
