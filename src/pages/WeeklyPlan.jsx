import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, CheckCircle2, Wand2, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { FullSpinner, ErrorBox, Spinner, Modal } from '../components/ui';
import { slotsForRole } from '../constants/timeSlots';
import { fetchWeeklyPlan, upsertWeeklyPlan, deleteWeeklyPlan } from '../lib/db';
import { generateDummyWeeklyPlan } from '../lib/dummyData';
import { currentWeekId, formatDateID } from '../lib/utils';

export default function WeeklyPlan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const templates = slotsForRole(user.role);

  const emptySlots = () => templates.map((t) => ({ ...t, prospect: '', location: '', objective: '' }));

  const [slots, setSlots] = useState(emptySlots);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const existing = await fetchWeeklyPlan(user.id, currentWeekId());
        if (existing?.slots?.length) {
          const byTime = new Map(existing.slots.map((s) => [s.time, s]));
          setSlots(templates.map((t) => ({ ...t, ...(byTime.get(t.time) || {}) })));
          setSubmitted(Boolean(existing.submitted_at));
          setHasData(true);
        }
      } catch (e) {
        setError(e.message || 'Gagal memuat rencana.');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  function updateSlot(idx, patch) {
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  async function save(submit) {
    setSaving(true);
    setError('');
    try {
      await upsertWeeklyPlan({ userId: user.id, role: user.role, slots, submit });
      setHasData(true);
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

  async function handleAddDummy() {
    setBusy('dummy');
    setError('');
    try {
      const dummy = generateDummyWeeklyPlan(user.role);
      setSlots(templates.map((t) => {
        const d = dummy.find((x) => x.time === t.time);
        return { ...t, prospect: d?.prospect || '', location: d?.location || '', objective: d?.objective || '' };
      }));
      await upsertWeeklyPlan({ userId: user.id, role: user.role, slots: dummy, submit: true });
      setSubmitted(true);
      setHasData(true);
    } catch (e) {
      setError(e.message || 'Gagal menambah dummy rencana.');
    } finally {
      setBusy('');
    }
  }

  async function handleDeleteDummy() {
    setBusy('delete');
    setError('');
    try {
      await deleteWeeklyPlan(user.id, currentWeekId());
      setSlots(emptySlots());
      setSubmitted(false);
      setHasData(false);
    } catch (e) {
      setError(e.message || 'Gagal menghapus rencana.');
    } finally {
      setBusy('');
      setConfirmDelete(false);
    }
  }

  return (
    <Layout title="Rencana Minggu Ini" back={true}>
      {loading ? (
        <FullSpinner label="Memuat rencana..." />
      ) : (
        <div className="space-y-5">
          {error && <ErrorBox>{error}</ErrorBox>}

          <div className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{currentWeekId()} · {user.role}</p>
              <p className="text-xs text-text-muted mt-0.5">{formatDateID(new Date())}</p>
              {submitted && (
                <p className="inline-flex items-center gap-1.5 text-xs text-score-4 mt-2">
                  <CheckCircle2 size={14} /> Rencana minggu ini sudah disubmit
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddDummy} disabled={Boolean(busy)} className="btn-ghost !py-2 text-xs border-hana-teal-500/40 text-hana-teal-600">
                {busy === 'dummy' ? <Spinner size={14} /> : <Wand2 size={14} />} Tambah Dummy
              </button>
              <button onClick={() => setConfirmDelete(true)} disabled={Boolean(busy) || !hasData} className="btn-ghost !py-2 text-xs border-score-1/40 text-score-1">
                <Trash2 size={14} /> Hapus Dummy
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {slots.map((slot, idx) => (
              <div key={slot.time} className="card">
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="font-display font-bold text-hana-teal-600">{slot.time}</span>
                  <span className="text-sm font-semibold leading-tight">{slot.label}</span>
                </div>
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Nasabah / Prospek</label>
                      <input className="w-full px-3 py-2 text-sm" value={slot.prospect} onChange={(e) => updateSlot(idx, { prospect: e.target.value })} placeholder="Nama prospek" />
                    </div>
                    <div>
                      <label className="label">Lokasi / Cabang</label>
                      <input className="w-full px-3 py-2 text-sm" value={slot.location} onChange={(e) => updateSlot(idx, { location: e.target.value })} placeholder="Lokasi" />
                    </div>
                  </div>
                  <div>
                    <label className="label">Objective Spesifik</label>
                    <textarea rows={2} className="w-full px-3 py-2 text-sm resize-y" value={slot.objective} onChange={(e) => updateSlot(idx, { objective: e.target.value })} placeholder="Target/objektif slot ini" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end sticky bottom-4">
            <button onClick={() => save(false)} disabled={saving} className="btn-ghost sm:w-auto">
              <Save size={16} /> Simpan Draft
            </button>
            <button onClick={() => save(true)} disabled={saving} className="btn-teal sm:w-auto">
              <CheckCircle2 size={16} /> Submit Rencana
            </button>
          </div>
        </div>
      )}

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Hapus Rencana Minggu Ini?"
        footer={
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setConfirmDelete(false)} className="btn-ghost">Batal</button>
            <button onClick={handleDeleteDummy} disabled={busy === 'delete'} className="btn-pink">
              {busy === 'delete' ? <Spinner size={16} className="text-white" /> : <Trash2 size={16} />} Hapus
            </button>
          </div>
        }
      >
        <p className="text-sm text-text-secondary">
          Tindakan ini menghapus rencana mingguan Anda untuk {currentWeekId()}. Aktivitas harian tidak terpengaruh.
        </p>
      </Modal>
    </Layout>
  );
}
