import { useState } from 'react';
import { Check, Zap, X as XIcon, ImagePlus, Loader2, Lock, AlertTriangle, CheckCircle2, ClipboardList, Save, FileText, Sparkles } from 'lucide-react';
import { clsx, isStructuredFilled } from '../lib/utils';
import { uploadActivityImage } from '../lib/storage';
import SlotFormRenderer from './SlotFormRenderer';
import { Spinner } from './ui';

const STATUS_OPTIONS = [
  { value: 'done', label: 'Done', icon: Check, color: '#22C55E' },
  { value: 'partial', label: 'Partial', icon: Zap, color: '#F97316' },
  { value: 'not_done', label: 'Not Done', icon: XIcon, color: '#EF4444' },
];

export default function ActivitySlot({
  slot,
  userId,
  date,
  onChange,
  windowState = 'open',
  startLabel,
  endLabel,
  users,
  formSchema = [],
  onSave,
  saving = false,
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');

  const isOpen = windowState === 'open';
  const isClosed = windowState === 'closed';
  const isUpcoming = windowState === 'upcoming';

  const isCompleted = slot.activity_status === 'done' || slot.activity_status === 'partial';
  const canEditActual = isOpen; // hasil per item + tombol status
  // Alasan & bukti hanya relevan bila belum selesai (slot terlewat / sedang berjalan).
  const showReasonEvidence = !isCompleted && (isOpen || isClosed);

  const hasSchema = Array.isArray(formSchema) && formSchema.length > 0;
  const hasActualFields = formSchema.some((f) => f.type === 'list' && f.resultSchema?.length > 0);
  const isPdf = (slot.image_path || '').toLowerCase().endsWith('.pdf');

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

  // Format "07:30 – 08:00"
  const timeLabel = slot.endTime ? `${slot.time} – ${slot.endTime}` : slot.time;

  return (
    <div
      className={clsx('relative rounded-2xl border border-white/80 bg-white/90 p-4 shadow-card backdrop-blur-xl', isUpcoming && 'opacity-95')}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-hana-teal-50 px-2.5 py-1 font-display text-sm font-bold text-hana-teal-700">{slot.endTime ? `${slot.time} - ${slot.endTime}` : slot.time}</span>
            <span className={clsx('badge', isOpen ? 'border-hana-teal-100 bg-hana-teal-50 text-hana-teal-700' : isClosed ? 'border-score-1/25 bg-score-1/10 text-score-1' : 'border-hana-border bg-elevated text-text-secondary')}>
              {isOpen ? 'Terbuka' : isClosed ? 'Tertutup' : 'Belum Waktu'}
            </span>
          </div>
          <p className="truncate text-sm font-bold text-ink">{slot.label}</p>
        </div>
        {slot.extra && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-hana-pink-100 bg-hana-pink-50 px-2 py-1 text-[10px] font-bold text-hana-pink-600">
            <Sparkles size={11} /> Tambahan
          </span>
        )}
      </div>

      {/* Banner status jendela waktu */}
      {isUpcoming ? (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-hana-border bg-elevated px-3 py-2 text-xs text-text-secondary">
          <Lock size={14} /> Belum waktunya — terbuka pukul <b>{startLabel}</b>
        </div>
      ) : isCompleted ? (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-score-4/30 bg-score-4/10 px-3 py-2 text-xs text-score-4">
          <CheckCircle2 size={14} className="shrink-0" />
          <span>Slot berhasil diselesaikan{slot.activity_status === 'partial' ? ' (sebagian)' : ''}.</span>
        </div>
      ) : isClosed ? (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-score-1/30 bg-score-1/10 px-3 py-2 text-xs text-score-1">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>Slot tertutup (tutup {endLabel}) — tercatat <b>tidak selesai</b>. Anda tetap dapat memberi alasan &amp; bukti di bawah.</span>
        </div>
      ) : null}

      {/* Panel RENCANA (read-only) — dari Weekly Plan */}
      <div className="mb-3 rounded-2xl border border-hana-border bg-elevated/70 px-3 py-2.5">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-text-secondary">
          <ClipboardList size={13} /> Rencana
        </p>
        {hasSchema ? (
          <SlotFormRenderer schema={formSchema} value={slot.planned_data || {}} users={users} readOnly />
        ) : slot.extra && isStructuredFilled(slot.planned_data) ? (
          <dl className="space-y-1">
            {Object.entries(slot.planned_data).map(([k, v]) =>
              v ? (
                <div key={k} className="rounded-xl border border-hana-border/70 bg-white/70 px-3 py-2 text-xs">
                  <dt className="font-semibold text-text-secondary capitalize">{k.replace(/_/g, ' ')}</dt>
                  <dd className="text-ink">{String(v)}</dd>
                </div>
              ) : null
            )}
          </dl>
        ) : slot.extra ? (
          <p className="text-xs text-text-muted italic">Rencana tambahan — isi hasilnya di bawah.</p>
        ) : slot.planned ? (
          <p className="text-xs text-ink">{slot.planned}</p>
        ) : (
          <p className="text-xs text-text-muted italic">Belum ada rencana untuk slot ini.</p>
        )}
      </div>

      {/* HASIL AKTUAL — hanya untuk slot dengan item rencana (list). Slot non-list cukup status. */}
      {hasActualFields ? (
        <>
          <label className="label">Hasil per Item {canEditActual && '*'}</label>
          <div className={clsx(!canEditActual && 'opacity-70 pointer-events-none')}>
            <SlotFormRenderer
              mode="actual"
              schema={formSchema}
              value={slot.actual_data || {}}
              plannedValue={slot.planned_data || {}}
              onChange={(actual_data) => update({ actual_data })}
              users={users}
              disabled={!canEditActual}
            />
          </div>
        </>
      ) : !hasSchema ? (
        <>
          <label className="label">Hasil Aktual {canEditActual && '*'}</label>
          <textarea
            rows={2}
            disabled={!canEditActual}
            value={slot.actual || ''}
            onChange={(e) => update({ actual: e.target.value })}
            placeholder={canEditActual ? 'Apa yang benar-benar dilakukan di slot ini?' : '—'}
            className="w-full resize-y rounded-xl border-hana-border bg-white/95 px-3.5 py-2.5 text-sm shadow-sm disabled:bg-elevated disabled:cursor-not-allowed"
          />
        </>
      ) : null}

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
                  'flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                  active ? 'text-white' : 'text-text-secondary border-hana-border hover:border-text-secondary'
                )}
                style={active ? { backgroundColor: `${color}26`, borderColor: color, color } : undefined}
              >
                <Icon size={14} /> {label}
              </button>
            );
          })}
        </div>
        {isClosed && !isCompleted && (
          <p className="text-[10px] text-text-muted mt-1">Status terkunci sebagai "Not Done" karena slot sudah lewat.</p>
        )}
      </div>

      {showReasonEvidence && (
        <>
          <div className="mt-3">
            <label className="label">{isClosed ? 'Alasan tidak mengisi tepat waktu' : 'Catatan (opsional)'}</label>
            <textarea
              rows={isClosed ? 2 : 1}
              value={slot.notes || ''}
              onChange={(e) => update({ notes: e.target.value })}
              placeholder={isClosed ? 'Jelaskan kenapa slot ini terlewat...' : 'Catatan tambahan...'}
              className="w-full resize-y rounded-xl border-hana-border bg-white/95 px-3.5 py-2.5 text-sm shadow-sm"
            />
          </div>

          <div className="mt-3">
            <label className="label">{isClosed ? 'Bukti (pendukung alasan)' : 'Bukti (foto/PDF, auto-kompres)'}</label>
            {slot.image_url ? (
              isPdf ? (
                <div className="flex items-center gap-3">
                  <a href={slot.image_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-hana-teal-700 hover:underline">
                    <FileText size={16} /> Lihat dokumen (PDF)
                  </a>
                  <button type="button" onClick={() => update({ image_path: null, image_url: null })} className="text-xs text-score-1 hover:underline">
                    Hapus
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <img src={slot.image_url} alt="bukti" className="h-16 w-16 rounded-xl border border-hana-border object-cover" />
                  <button type="button" onClick={() => update({ image_path: null, image_url: null })} className="text-xs text-score-1 hover:underline">
                    Hapus
                  </button>
                </div>
              )
            ) : (
              <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-hana-border bg-white/80 px-3 py-2 text-xs font-bold text-text-secondary shadow-sm transition-colors hover:bg-white hover:text-ink">
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                {uploading ? 'Mengupload...' : 'Upload File'}
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
                  className="hidden"
                  onChange={handleFile}
                  disabled={uploading}
                />
              </label>
            )}
            {uploadErr && <p className="text-xs text-score-1 mt-1">{uploadErr}</p>}
          </div>
        </>
      )}

      {/* Bukti tetap tampil read-only saat slot sudah selesai */}
      {isCompleted && slot.image_url && (
        <div className="mt-3">
          <label className="label">Bukti</label>
          {isPdf ? (
            <a href={slot.image_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-hana-teal-700 hover:underline">
              <FileText size={16} /> Lihat dokumen (PDF)
            </a>
          ) : (
            <img src={slot.image_url} alt="bukti" className="h-16 w-16 rounded-xl border border-hana-border object-cover" />
          )}
        </div>
      )}

      {/* Per-card save button */}
      {onSave && (
        <div className="mt-4 flex justify-end border-t border-hana-border pt-3">
          <button
            type="button"
            onClick={onSave}
            disabled={saving || isUpcoming}
            className="btn-teal !px-4 !py-2 text-xs disabled:opacity-60"
          >
            {saving ? <Spinner size={13} className="text-white" /> : <Save size={13} />}
            {saving ? 'Menyimpan...' : 'Simpan Slot'}
          </button>
        </div>
      )}
    </div>
  );
}
