import { useState } from 'react';
import { Send, AlertTriangle } from 'lucide-react';
import { Modal, ErrorBox, Spinner } from '../../components/ui';
import { sendWarnings } from '../../lib/db';
import { useAuth } from '../../contexts/AuthContext';
import { clsx } from '../../lib/utils';

// users: kandidat target (semua kecuali RH). preselect: array user_id
export default function WarningModal({ open, onClose, users, preselect = [], onSent }) {
  const { user } = useAuth();
  const [selected, setSelected] = useState(preselect);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  // sync preselect saat modal dibuka
  function toggle(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function handleSend() {
    setError('');
    if (selected.length === 0) return setError('Pilih minimal satu target.');
    if (!title.trim()) return setError('Judul surat wajib diisi.');
    if (!message.trim()) return setError('Isi pesan wajib diisi.');
    setSending(true);
    try {
      await sendWarnings({ fromId: user.id, toIds: selected, title: title.trim(), message: message.trim() });
      onSent?.();
      setTitle('');
      setMessage('');
      setSelected([]);
      onClose();
    } catch (e) {
      setError(e.message || 'Gagal mengirim surat peringatan.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="⚠️ Kirim Surat Peringatan"
      footer={
        <button onClick={handleSend} disabled={sending} className="btn-pink w-full">
          {sending ? <Spinner size={16} className="text-white" /> : <Send size={16} />} Kirim Peringatan
        </button>
      }
    >
      <div className="space-y-4">
        {error && <ErrorBox>{error}</ErrorBox>}

        <div>
          <label className="label">Pilih Target (bisa lebih dari satu)</label>
          <div className="grid grid-cols-2 gap-2">
            {users.map((u) => {
              const active = selected.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggle(u.id)}
                  className={clsx(
                    'px-3 py-2 rounded-lg border text-left text-xs transition-colors',
                    active ? 'border-hana-pink-500 bg-hana-pink-500/15 text-white' : 'border-hana-border text-text-secondary'
                  )}
                >
                  <span className="font-semibold block truncate">{u.name}</span>
                  <span className="text-[10px] text-text-muted">{u.role}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="label">Judul Surat</label>
          <input
            className="w-full px-3 py-2 text-sm"
            placeholder="Mis. Peringatan Performa Kritis"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Isi Pesan</label>
          <textarea
            rows={5}
            className="w-full px-3 py-2 text-sm resize-y"
            placeholder="Tuliskan isi surat peringatan..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <p className="flex items-center gap-1.5 text-[11px] text-text-muted">
          <AlertTriangle size={12} /> Surat akan tampil sebagai banner merah di dashboard target.
        </p>
      </div>
    </Modal>
  );
}
