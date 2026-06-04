import { useState } from 'react';
import { Check, Zap, X as XIcon, ImagePlus, Loader2, Lock, Clock, AlertTriangle, ClipboardList } from 'lucide-react';
import { clsx } from '../lib/utils';
import { uploadActivityImage } from '../lib/storage';
import SlotFormRenderer from './SlotFormRenderer';

const STATUS_OPTIONS = [
  { value: 'done', label: 'Done', icon: Check, color: '#22C55E' },
  { value: 'partial', label: 'Partial', icon: Zap, color: '#F97316' },
  { value: 'not_done', label: 'Not Done', icon: XIcon, color: '#EF4444' },
];

export default function ActivitySlot({ slot, userId, date, onChange, windowState = 'open', startLabel, endLabel, users, formSchema = [] }) {
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');

  const isOpen = windowState === 'open';
  const isClosed = windowState === 'closed';
  const isUpcoming = windowState === 'upcoming';

  // Saat OPEN: semua field aktif.
  // Saat CLOSED: "Hasil Aktual" & status terkunci (tetap not_done), tapi alasan & foto AKTIF.
  // Saat UPCOMING: semua terkunci.
  const canEditActual = isOpen;
  const canAttach = isOpen || isClosed; // alasan/catatan & foto bukti
  const hasSchema = Array.isArray(formSchema) && formSchema.length > 0;

  function update(patch) {
    onChange({ ...slot, ...patch });
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErr('');
    setUploading(true);
    try {
      const { path, url } = await uploadActivityImage({ userId, date, timeSlot: slot.time, file });
      update({ image_path: path, image_url: url });
    } catch (err) {
      setUploadErr(err.message || 'Upload gagal.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  const statusColor = STATUS_OPTIONS.find((s) => s.value === slot.activity_status)?.color;
  const accent = isClosed ? '#EF4444' : isUpcoming ? '#94A3B8' : statusColor;

  return (
    <div
      className={clsx('card relative', isUpcoming && 'opacity-95')}
      style={accent ? { borderLeftColor: accent, borderLeftWidth: 3 } : undefined}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="font-display font-bold text-hana-teal-700 text-base">{slot.time}</span>
          <span className="text-sm font-semibold text-ink leading-tight truncate">{slot.label}</span>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] text-text-muted shrink-0">
          <Clock size={11} /> {slot.duration}m
        </span>
      </div>

      {/* Banner status jendela waktu */}
      {isUpcoming && (
        <div className="mb-3 flex items-center gap-2 text-xs rounded-lg bg-elevated border border-hana-border px-3 py-2 text-text-secondary">
          <Lock size={14} /> Belum waktunya — terbuka pukul <b>{startLabel}</b>
        </div>
      )}
      {isClosed && (
        <div className="mb-3 flex items-start gap-2 text-xs rounded-lg bg-score-1/10 border border-score-1/30 px-3 py-2 text-score-1">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>Slot tertutup (tutup {endLabel}) — tercatat <b>tidak selesai</b>. Anda tetap dapat memberi alasan &amp; bukti foto di bawah.</span>
        </div>
      )}

      {/* Panel RENCANA (read-only) — dari Weekly Plan */}
      <div className="mb-3 rounded-lg bg-elevated border border-hana-border px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary mb-1.5">
          <ClipboardList size={13} /> Rencana
        </p>
        {hasSchema ? (
          <SlotFormRenderer schema={formSchema} value={slot.planned_data || {}} users={users} readOnly />
        ) : slot.planned ? (
          <p className="text-xs text-ink">{slot.planned}</p>
        ) : (
          <p className="text-xs text-text-muted italic">Belum ada rencana untuk slot ini.</p>
        )}
      </div>

      {/* HASIL AKTUAL — terstruktur (mengikuti schema slot) */}
      <label className="label">Hasil Aktual {canEditActual && '*'}</label>
      {hasSchema ? (
        <div className={clsx(!canEditActual && 'opacity-70 pointer-events-none')}>
          <SlotFormRenderer
            schema={formSchema}
            value={slot.actual_data || {}}
            onChange={(actual_data) => update({ actual_data })}
            users={users}
            disabled={!canEditActual}
          />
        </div>
      ) : (
        <textarea
          rows={2}
          disabled={!canEditActual}
          value={slot.actual || ''}
          onChange={(e) => update({ actual: e.target.value })}
          placeholder={canEditActual ? 'Apa yang benar-benar dilakukan di slot ini?' : '—'}
          className="w-full text-sm px-3 py-2 resize-y disabled:bg-elevated disabled:cursor-not-allowed"
        />
      )}

      <div className="mt-3">
        <label className="label">Status</label>
        <div className="grid grid-cols-3 gap-2">
          {STATUS_OPTIONS.map(({ value, label, icon: Icon, color }) => {
            const active = slot.activity_status === value;
            return (
              <button
                key={value}
                type="button"
                disabled={!canEditActual}
                onClick={() => update({ activity_status: value })}
                className={clsx(
                  'flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold border transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                  active ? 'text-white' : 'text-text-secondary border-hana-border hover:border-text-secondary'
                )}
                style={active ? { backgroundColor: `${color}26`, borderColor: color, color } : undefined}
              >
                <Icon size={14} /> {label}
              </button>
            );
          })}
        </div>
        {isClosed && (
          <p className="text-[10px] text-text-muted mt-1">Status terkunci sebagai "Not Done" karena slot sudah lewat.</p>
        )}
      </div>

      <div className="mt-3">
        <label className="label">{isClosed ? 'Alasan tidak mengisi tepat waktu' : 'Catatan (opsional)'}</label>
        <textarea
          rows={isClosed ? 2 : 1}
          disabled={!canAttach}
          value={slot.notes || ''}
          onChange={(e) => update({ notes: e.target.value })}
          placeholder={canAttach ? (isClosed ? 'Jelaskan kenapa slot ini terlewat...' : 'Catatan tambahan...') : '—'}
          className="w-full text-sm px-3 py-2 resize-y disabled:bg-elevated disabled:cursor-not-allowed"
        />
      </div>

      {canAttach && (
        <div className="mt-3">
          <label className="label">{isClosed ? 'Bukti Foto (pendukung alasan)' : 'Bukti Foto (maks 500KB setelah kompresi)'}</label>
          {slot.image_url ? (
            <div className="flex items-center gap-3">
              <img src={slot.image_url} alt="bukti" className="h-16 w-16 rounded-lg object-cover border border-hana-border" />
              <button type="button" onClick={() => update({ image_path: null, image_url: null })} className="text-xs text-score-1 hover:underline">
                Hapus foto
              </button>
            </div>
          ) : (
            <label className="inline-flex items-center gap-2 cursor-pointer btn-ghost !py-2 !px-3 text-xs w-fit">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
              {uploading ? 'Mengupload...' : 'Upload Foto'}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} disabled={uploading} />
            </label>
          )}
          {uploadErr && <p className="text-xs text-score-1 mt-1">{uploadErr}</p>}
        </div>
      )}

      {slot.image_url && isUpcoming && (
        <div className="mt-3">
          <img src={slot.image_url} alt="bukti" className="h-16 w-16 rounded-lg object-cover border border-hana-border" />
        </div>
      )}
    </div>
  );
}
