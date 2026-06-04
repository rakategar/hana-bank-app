import { useState } from 'react';
import { TrendingUp, AlertTriangle, Lightbulb, Plus, X, CalendarClock, CheckCircle2 } from 'lucide-react';
import { levelInfo, clsx } from '../lib/utils';

const STATUS_TO_LEVEL = {
  critical: 'CRITICAL',
  recovery: 'RECOVERY',
  on_track: 'ON TRACK',
  high_impact: 'HIGH IMPACT',
};

export function PerformancePill({ status }) {
  const info = levelInfo(STATUS_TO_LEVEL[status] || status);
  if (!info) return null;
  return (
    <span
      className="px-3 py-1 rounded-full text-[11px] font-semibold uppercase"
      style={{ backgroundColor: `${info.color}26`, color: info.color }}
    >
      {info.label}
    </span>
  );
}

function PointList({ icon: Icon, title, items, color }) {
  if (!items?.length) return null;
  return (
    <div className="mt-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color }}>
        <Icon size={14} /> {title}
      </p>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="text-xs text-text-secondary flex gap-2">
            <span style={{ color }}>•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Kartu ringkasan per orang (FA/FWSS)
export function PersonSummaryCard({ name, status, summary, highlights, risks, recommendations, recLabel = 'Rekomendasi' }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="font-display text-lg font-bold">{name}</h3>
        <PerformancePill status={status} />
      </div>
      {summary && <p className="text-sm text-text-secondary leading-relaxed">{summary}</p>}
      <PointList icon={TrendingUp} title="Highlights" items={highlights} color="#22C55E" />
      <PointList icon={AlertTriangle} title="Risiko" items={risks} color="#F97316" />
      <PointList icon={Lightbulb} title={recLabel} items={recommendations} color="#04B292" />
    </div>
  );
}

// Editor action plan: template checklist + custom.
// scheduleEnabled → tiap aksi bisa diberi jadwal (tanggal+jam) untuk masuk agenda harian.
//   dateOptions: [{ value: 'YYYY-MM-DD', label: 'Sen 8 Jun' }], timeOptions: ['07:30', ...]
export function ActionPlanEditor({ templates, value, onChange, scheduleEnabled = false, dateOptions = [], timeOptions = [] }) {
  const [custom, setCustom] = useState('');
  const [openSched, setOpenSched] = useState(null); // id aksi yang sedang dijadwalkan

  function toggleTemplate(label) {
    const exists = value.find((a) => a.label === label);
    if (exists) {
      onChange(value.filter((a) => a.label !== label));
    } else {
      onChange([...value, { id: crypto.randomUUID(), type: 'template', label, is_completed: false }]);
    }
  }

  function addCustom() {
    const t = custom.trim();
    if (!t) return;
    onChange([...value, { id: crypto.randomUUID(), type: 'custom', label: t, is_completed: false }]);
    setCustom('');
  }

  function removeAction(id) {
    onChange(value.filter((a) => a.id !== id));
  }

  function setSchedule(id, schedule) {
    onChange(value.map((a) => (a.id === id ? { ...a, schedule } : a)));
  }

  const dateLabel = (d) => dateOptions.find((o) => o.value === d)?.label || d;

  return (
    <div className="space-y-2">
      {templates.map((label) => {
        const checked = value.some((a) => a.label === label);
        return (
          <label key={label} className={clsx('flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer text-sm', checked ? 'border-hana-teal-500 bg-hana-teal-500/10' : 'border-hana-border')}>
            <input type="checkbox" checked={checked} onChange={() => toggleTemplate(label)} className="accent-hana-teal-500 h-4 w-4" />
            <span className={checked ? 'text-ink font-medium' : 'text-text-secondary'}>{label}</span>
          </label>
        );
      })}

      {/* Custom actions yang sudah ditambahkan */}
      {value.filter((a) => a.type === 'custom').map((a) => (
        <div key={a.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-hana-pink-500/40 bg-hana-pink-50 text-sm">
          <span className="flex-1 text-ink">{a.label}</span>
          <button onClick={() => removeAction(a.id)} className="text-text-muted hover:text-score-1"><X size={14} /></button>
        </div>
      ))}

      <div className="flex gap-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())}
          placeholder="Tambah action plan custom..."
          className="flex-1 px-3 py-2 text-sm"
        />
        <button onClick={addCustom} type="button" className="btn-ghost !px-3"><Plus size={16} /></button>
      </div>

      {/* Penjadwalan aksi → masuk agenda harian (opsional) */}
      {scheduleEnabled && value.length > 0 && (
        <div className="mt-3 pt-3 border-t border-hana-border space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
            <CalendarClock size={14} /> Jadwalkan aksi ke agenda (opsional)
          </p>
          {value.map((a) => {
            const sched = a.schedule;
            const isOpen = openSched === a.id;
            return (
              <div key={a.id} className="rounded-lg border border-hana-border px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-ink truncate">{a.label}</span>
                  {sched ? (
                    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold', sched.extra_plan_id ? 'bg-score-4/15 text-score-4' : 'bg-hana-teal-500/15 text-hana-teal-700')}>
                      {sched.extra_plan_id ? <CheckCircle2 size={11} /> : <CalendarClock size={11} />}
                      {dateLabel(sched.date)} · {sched.time}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setOpenSched(isOpen ? null : a.id)}
                    className="text-hana-teal-700 font-semibold hover:underline shrink-0"
                  >
                    {sched ? 'Ubah' : 'Jadwalkan'}
                  </button>
                  {sched && (
                    <button type="button" onClick={() => { setSchedule(a.id, null); setOpenSched(null); }} className="text-text-muted hover:text-score-1 shrink-0">
                      <X size={13} />
                    </button>
                  )}
                </div>
                {isOpen && (
                  <div className="flex flex-wrap items-end gap-2 mt-2">
                    <div>
                      <label className="block text-[10px] text-text-muted mb-0.5">Tanggal</label>
                      <select
                        value={sched?.date || dateOptions[0]?.value || ''}
                        onChange={(e) => setSchedule(a.id, { date: e.target.value, time: sched?.time || timeOptions[0] })}
                        className="px-2 py-1.5 text-xs"
                      >
                        {dateOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-text-muted mb-0.5">Jam</label>
                      <select
                        value={sched?.time || timeOptions[0] || ''}
                        onChange={(e) => setSchedule(a.id, { date: sched?.date || dateOptions[0]?.value, time: e.target.value })}
                        className="px-2 py-1.5 text-xs"
                      >
                        {timeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <button type="button" onClick={() => setOpenSched(null)} className="btn-teal !py-1.5 !px-3 text-xs">
                      Masukkan ke agenda
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          <p className="text-[10px] text-text-muted">Aksi terjadwal akan muncul di Input Aktivitas Anda pada tanggal & jam tsb setelah disimpan.</p>
        </div>
      )}
    </div>
  );
}
