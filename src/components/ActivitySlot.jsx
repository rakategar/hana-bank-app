import { useState } from 'react';
import { Check, Zap, X as XIcon, ImagePlus, Loader2 } from 'lucide-react';
import { clsx } from '../lib/utils';
import { uploadActivityImage } from '../lib/storage';

const STATUS_OPTIONS = [
  { value: 'done', label: 'Done', icon: Check, color: '#22C55E' },
  { value: 'partial', label: 'Partial', icon: Zap, color: '#F97316' },
  { value: 'not_done', label: 'Not Done', icon: XIcon, color: '#EF4444' },
];

export default function ActivitySlot({ slot, userId, date, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');

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

  return (
    <div
      className="card relative"
      style={statusColor ? { borderLeftColor: statusColor, borderLeftWidth: 3 } : undefined}
    >
      <div className="flex items-baseline gap-2 mb-3">
        <span className="font-display font-bold text-hana-teal-600 text-base">{slot.time}</span>
        <span className="text-sm font-semibold text-ink leading-tight">{slot.label}</span>
      </div>

      {slot.planned && (
        <div className="mb-3 text-xs text-text-secondary bg-elevated rounded-lg px-3 py-2 border border-hana-border">
          <span className="font-medium text-text-secondary">Rencana: </span>
          {slot.planned}
        </div>
      )}

      <label className="label">Hasil Aktual *</label>
      <textarea
        rows={2}
        value={slot.actual || ''}
        onChange={(e) => update({ actual: e.target.value })}
        placeholder="Apa yang benar-benar dilakukan di slot ini?"
        className="w-full text-sm px-3 py-2 resize-y"
      />

      <div className="mt-3">
        <label className="label">Status</label>
        <div className="grid grid-cols-3 gap-2">
          {STATUS_OPTIONS.map(({ value, label, icon: Icon, color }) => {
            const active = slot.activity_status === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => update({ activity_status: value })}
                className={clsx(
                  'flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold border transition-colors',
                  active ? 'text-white' : 'text-text-secondary border-hana-border hover:border-text-secondary'
                )}
                style={active ? { backgroundColor: `${color}26`, borderColor: color, color } : undefined}
              >
                <Icon size={14} /> {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3">
        <label className="label">Catatan (opsional)</label>
        <textarea
          rows={1}
          value={slot.notes || ''}
          onChange={(e) => update({ notes: e.target.value })}
          placeholder="Catatan tambahan..."
          className="w-full text-sm px-3 py-2 resize-y"
        />
      </div>

      <div className="mt-3">
        <label className="label">Bukti Foto (maks 500KB setelah kompresi)</label>
        {slot.image_url ? (
          <div className="flex items-center gap-3">
            <img src={slot.image_url} alt="bukti" className="h-16 w-16 rounded-lg object-cover border border-hana-border" />
            <button
              type="button"
              onClick={() => update({ image_path: null, image_url: null })}
              className="text-xs text-score-1 hover:underline"
            >
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
    </div>
  );
}
