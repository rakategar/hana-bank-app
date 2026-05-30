import { useState } from 'react';
import { Clock, RotateCcw } from 'lucide-react';
import { useDemoTime } from '../contexts/DemoTimeContext';
import { Modal } from './ui';
import { fmtClock, formatDateID, clsx } from '../lib/utils';

function toLocalInput(d) {
  const z = new Date(d);
  z.setMinutes(z.getMinutes() - z.getTimezoneOffset());
  return z.toISOString().slice(0, 16);
}

const PRESETS = ['07:30', '09:00', '12:00', '16:30', '18:30'];

export default function DemoClock() {
  const { now, setNow, resetNow, overridden } = useDemoTime();
  const [open, setOpen] = useState(false);

  function applyPreset(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    setNow(d);
  }

  function shiftDay(delta) {
    const d = new Date(now);
    d.setDate(d.getDate() + delta);
    setNow(d);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={clsx(
          'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
          overridden ? 'border-hana-pink-500/40 bg-hana-pink-50 text-hana-pink-600' : 'border-hana-border text-text-secondary hover:text-ink'
        )}
        title="Atur waktu demo"
      >
        <Clock size={15} /> {fmtClock(now)}
        {overridden && <span className="hidden sm:inline text-[10px] font-semibold">DEMO</span>}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="🕒 Waktu Demo"
        maxWidth="max-w-md"
        footer={
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { resetNow(); setOpen(false); }} className="btn-ghost">
              <RotateCcw size={15} /> Reset ke waktu asli
            </button>
            <button onClick={() => setOpen(false)} className="btn-teal">Selesai</button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-text-secondary">
            Ini website demo. Atur waktu untuk menguji penjadwalan & penguncian slot aktivitas
            (slot terbuka pada jam terjadwal hingga durasi + 30 menit).
          </p>

          <div className="rounded-lg bg-elevated border border-hana-border px-3 py-2 text-sm">
            <span className="font-semibold">{formatDateID(now)}</span>
            <span className="text-text-muted"> · {fmtClock(now)}</span>
          </div>

          <div>
            <label className="label">Set tanggal &amp; jam</label>
            <input
              type="datetime-local"
              className="w-full px-3 py-2 text-sm"
              value={toLocalInput(now)}
              onChange={(e) => e.target.value && setNow(new Date(e.target.value))}
            />
          </div>

          <div>
            <label className="label">Geser hari</label>
            <div className="flex gap-2">
              <button onClick={() => shiftDay(-1)} className="btn-ghost !py-1.5 text-xs flex-1">− 1 hari</button>
              <button onClick={() => shiftDay(1)} className="btn-ghost !py-1.5 text-xs flex-1">+ 1 hari</button>
            </div>
          </div>

          <div>
            <label className="label">Lompat ke jam</label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button key={p} onClick={() => applyPreset(p)} className="btn-ghost !py-1.5 !px-3 text-xs">{p}</button>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
