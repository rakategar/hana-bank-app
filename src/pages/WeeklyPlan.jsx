import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { FullSpinner, ErrorBox } from '../components/ui';
import { slotsForRole } from '../constants/timeSlots';
import { fetchWeeklyPlan, upsertWeeklyPlan } from '../lib/db';
import { currentWeekId, formatDateID } from '../lib/utils';

export default function WeeklyPlan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const templates = slotsForRole(user.role);

  const [slots, setSlots] = useState(() =>
    templates.map((t) => ({ ...t, prospect: '', location: '', objective: '' }))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const existing = await fetchWeeklyPlan(user.id, currentWeekId());
        if (existing?.slots?.length) {
          const byTime = new Map(existing.slots.map((s) => [s.time, s]));
          setSlots(templates.map((t) => ({ ...t, ...(byTime.get(t.time) || {}) })));
          setSubmitted(Boolean(existing.submitted_at));
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
    <Layout title="Rencana Minggu Ini" back={true}>
      {loading ? (
        <FullSpinner label="Memuat rencana..." />
      ) : (
        <div className="space-y-4">
          {error && <ErrorBox>{error}</ErrorBox>}

          <div className="card">
            <p className="text-sm font-semibold">{currentWeekId()} · {user.role}</p>
            <p className="text-xs text-text-muted mt-0.5">{formatDateID(new Date())}</p>
            {submitted && (
              <p className="inline-flex items-center gap-1.5 text-xs text-score-4 mt-2">
                <CheckCircle2 size={14} /> Rencana minggu ini sudah disubmit
              </p>
            )}
          </div>

          <div className="space-y-3">
            {slots.map((slot, idx) => (
              <div key={slot.time} className="card">
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="font-display font-bold text-hana-teal-500">{slot.time}</span>
                  <span className="text-sm font-semibold leading-tight">{slot.label}</span>
                </div>
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Nasabah / Prospek</label>
                      <input
                        className="w-full px-3 py-2 text-sm"
                        value={slot.prospect}
                        onChange={(e) => updateSlot(idx, { prospect: e.target.value })}
                        placeholder="Nama prospek"
                      />
                    </div>
                    <div>
                      <label className="label">Lokasi / Cabang</label>
                      <input
                        className="w-full px-3 py-2 text-sm"
                        value={slot.location}
                        onChange={(e) => updateSlot(idx, { location: e.target.value })}
                        placeholder="Lokasi"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">Objective Spesifik</label>
                    <textarea
                      rows={2}
                      className="w-full px-3 py-2 text-sm resize-y"
                      value={slot.objective}
                      onChange={(e) => updateSlot(idx, { objective: e.target.value })}
                      placeholder="Target/objektif slot ini"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sticky bottom-4">
            <button onClick={() => save(false)} disabled={saving} className="btn-ghost">
              <Save size={16} /> Simpan Draft
            </button>
            <button onClick={() => save(true)} disabled={saving} className="btn-teal">
              <CheckCircle2 size={16} /> Submit Rencana
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
