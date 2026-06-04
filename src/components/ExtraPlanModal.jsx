import { useMemo, useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { Modal, Spinner } from './ui';
import { slotsForRole } from '../constants/timeSlots';
import { weekdayDatesOf, todayISO, nowDate } from '../lib/utils';

// Modal "Tambah Rencana Tambahan" — rencana di tengah minggu (mis. follow-up lead)
// yang otomatis masuk agenda Daily Input pada tanggal/jam terjadwal.
export default function ExtraPlanModal({ open, onClose, role, onCreate }) {
  const today = todayISO();
  const slotOptions = slotsForRole(role);
  // Hanya hari kerja minggu ini yang >= hari ini.
  const dateOptions = useMemo(
    () => weekdayDatesOf(nowDate()).filter((d) => d.value >= today),
    [today]
  );

  const [date, setDate] = useState(dateOptions[0]?.value || today);
  const [time, setTime] = useState(slotOptions[0]?.time || '08:00');
  const [label, setLabel] = useState('');
  const [namaNasabah, setNamaNasabah] = useState('');
  const [produk, setProduk] = useState('');
  const [catatan, setCatatan] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  function reset() {
    setLabel(''); setNamaNasabah(''); setProduk(''); setCatatan(''); setErr('');
    setDate(dateOptions[0]?.value || today);
    setTime(slotOptions[0]?.time || '08:00');
  }

  async function handleSubmit() {
    if (!label.trim()) { setErr('Judul kegiatan wajib diisi.'); return; }
    if (!date) { setErr('Pilih tanggal.'); return; }
    const slot = slotOptions.find((s) => s.time === time);
    setSaving(true);
    setErr('');
    try {
      await onCreate({
        date,
        time,
        endTime: slot?.endTime || null,
        label: label.trim(),
        data: {
          ...(namaNasabah.trim() ? { nama_nasabah: namaNasabah.trim() } : {}),
          ...(produk.trim() ? { produk: produk.trim() } : {}),
          ...(catatan.trim() ? { catatan: catatan.trim() } : {}),
        },
      });
      reset();
      onClose();
    } catch (e) {
      setErr(e.message || 'Gagal menambah rencana.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tambah Rencana Tambahan"
      footer={
        <button onClick={handleSubmit} disabled={saving} className="btn-teal w-full">
          {saving ? <Spinner size={16} className="text-white" /> : <CalendarPlus size={16} />}
          {saving ? 'Menyimpan...' : 'Tambahkan ke Agenda'}
        </button>
      }
    >
      <div className="space-y-3">
        {err && <p className="text-xs text-score-1">{err}</p>}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Tanggal</label>
            <select value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 text-sm">
              {dateOptions.length === 0 && <option value={today}>Hari ini</option>}
              {dateOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Slot Jam</label>
            <select value={time} onChange={(e) => setTime(e.target.value)} className="w-full px-3 py-2 text-sm">
              {slotOptions.map((s) => (
                <option key={s.time} value={s.time}>{s.time} – {s.endTime}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Judul Kegiatan</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="mis. Follow-up lead Pak Budi" className="w-full px-3 py-2 text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Nama Nasabah / Lead <span className="text-text-muted font-normal">(opsional)</span></label>
            <input value={namaNasabah} onChange={(e) => setNamaNasabah(e.target.value)} className="w-full px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="label">Produk <span className="text-text-muted font-normal">(opsional)</span></label>
            <input value={produk} onChange={(e) => setProduk(e.target.value)} className="w-full px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="label">Catatan <span className="text-text-muted font-normal">(opsional)</span></label>
          <textarea rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Detail tindakan / tujuan" className="w-full px-3 py-2 text-sm resize-y" />
        </div>
      </div>
    </Modal>
  );
}
