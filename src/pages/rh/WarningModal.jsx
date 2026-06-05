import { useState } from 'react';
import { Send, AlertTriangle, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Modal, Spinner, Avatar } from '../../components/ui';
import { sendWarnings } from '../../lib/db';
import { useAuth } from '../../contexts/AuthContext';
import { clsx } from '../../lib/utils';

// users: kandidat target (semua kecuali RH). preselect: array user_id
export default function WarningModal({ open, onClose, users, preselect = [], onSent }) {
  const { user } = useAuth();
  const [selected, setSelected] = useState(preselect);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  function toggle(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function handleSend() {
    if (selected.length === 0) return toast.error('Pilih minimal satu target.');
    if (!title.trim()) return toast.error('Judul surat wajib diisi.');
    if (!message.trim()) return toast.error('Isi pesan wajib diisi.');
    setSending(true);
    try {
      await sendWarnings({ fromId: user.id, toIds: selected, title: title.trim(), message: message.trim() });
      onSent?.();
      setTitle('');
      setMessage('');
      setSelected([]);
      onClose();
    } catch (e) {
      toast.error(e.message || 'Gagal mengirim surat peringatan.');
    } finally {
      setSending(false);
    }
  }

  // Find users that are currently selected
  const selectedUsers = users.filter((u) => selected.includes(u.id));

  // Determine what to display for the recipient target field
  let targetSection;
  if (preselect.length === 1) {
    // Single recipient mode
    const recipient = users.find((u) => u.id === preselect[0]);
    if (recipient) {
      targetSection = (
        <div className="bg-slate-50 border border-hana-border/50 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <Avatar name={recipient.name} size={40} className="ring-2 ring-white shadow-sm shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider">Penerima Surat Peringatan</p>
            <p className="font-display text-base font-extrabold text-ink truncate mt-0.5">{recipient.name}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="inline-flex items-center rounded bg-slate-100 border border-slate-200/50 px-2 py-0.5 text-[10px] font-bold text-text-secondary uppercase">
                {recipient.role}
              </span>
              <span className="text-[10px] text-text-muted/60">&bull;</span>
              <span className="text-[11px] font-medium text-text-secondary">
                {recipient.branch}
              </span>
            </div>
          </div>
        </div>
      );
    }
  } else if (preselect.length > 1) {
    // Multiple preselected recipients mode
    targetSection = (
      <div className="bg-slate-50 border border-hana-border/50 rounded-2xl p-4 shadow-sm">
        <p className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider mb-2.5">Penerima Surat Peringatan ({selectedUsers.length})</p>
        <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto pr-1">
          {selectedUsers.map((u) => (
            <div key={u.id} className="inline-flex items-center gap-2 bg-white border border-hana-border/50 rounded-xl px-3 py-1.5 shadow-sm">
              <Avatar name={u.name} size={20} />
              <div className="text-xs leading-none">
                <span className="font-bold text-ink">{u.name}</span>
                <span className="ml-1 text-[10px] text-text-muted">({u.role})</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  } else {
    // No preselect: general selection mode (interactive search & select grid)
    targetSection = (
      <div>
        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Pilih Target Penerima</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[180px] overflow-y-auto pr-1">
          {users.map((u) => {
            const active = selected.includes(u.id);
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => toggle(u.id)}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all shadow-sm',
                  active
                    ? 'border-hana-pink-500 bg-hana-pink-50/50 text-ink ring-1 ring-hana-pink-500'
                    : 'border-hana-border/60 bg-white hover:bg-slate-50 text-text-secondary'
                )}
              >
                <Avatar name={u.name} size={28} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-ink text-xs block truncate">{u.name}</span>
                  <span className="text-[9px] text-text-muted mt-0.5 block">{u.role} &bull; {u.branch}</span>
                </div>
                <div className={clsx(
                  'h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition-colors',
                  active ? 'border-hana-pink-500 bg-hana-pink-500 text-white' : 'border-slate-300 bg-white'
                )}>
                  {active && <Check size={10} strokeWidth={4} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Kirim Surat Peringatan"
      footer={
        <button
          onClick={handleSend}
          disabled={sending}
          className="inline-flex items-center justify-center gap-2 w-full btn-pink !min-h-11 shadow-sm font-bold text-sm tracking-wide transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
        >
          {sending ? <Spinner size={16} className="text-white animate-spin" /> : <Send size={15} />}
          <span>Kirim Surat Peringatan</span>
        </button>
      }
    >
      <div className="space-y-5">
        {targetSection}

        <div>
          <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">Judul Surat</label>
          <input
            className="w-full rounded-xl border border-hana-border/80 bg-white px-3.5 py-2.5 text-sm font-medium text-ink placeholder-text-muted/60 focus:border-hana-pink-500 focus:outline-none focus:ring-2 focus:ring-hana-pink-500/20 transition-all shadow-sm"
            placeholder="Mis. Peringatan Performa Kritis"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">Isi Pesan</label>
          <textarea
            rows={5}
            className="w-full rounded-xl border border-hana-border/80 bg-white px-3.5 py-2.5 text-sm font-medium text-ink placeholder-text-muted/60 focus:border-hana-pink-500 focus:outline-none focus:ring-2 focus:ring-hana-pink-500/20 transition-all shadow-sm resize-none"
            placeholder="Tuliskan isi surat peringatan..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 bg-rose-50/50 border border-rose-100/30 rounded-xl px-3 py-2 text-rose-700">
          <AlertTriangle size={14} className="shrink-0" />
          <p className="text-[10px] font-semibold leading-relaxed">
            Surat peringatan ini akan langsung tampil sebagai banner merah di dashboard karyawan bersangkutan.
          </p>
        </div>
      </div>
    </Modal>
  );
}
