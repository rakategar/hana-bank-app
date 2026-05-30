import { useState } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { Modal } from './ui';
import { markWarningRead } from '../lib/db';
import { formatDateID } from '../lib/utils';

// warnings: array dari tabel warnings utk user ini. onRead: refresh callback.
export default function WarningBanner({ warnings = [], onRead }) {
  const [openId, setOpenId] = useState(null);
  const [busy, setBusy] = useState(false);

  const unread = warnings.filter((w) => !w.is_read);
  const active = warnings.find((w) => w.id === openId);

  if (warnings.length === 0) return null;

  async function handleMarkRead(id) {
    setBusy(true);
    try {
      await markWarningRead(id);
      onRead?.();
      setOpenId(null);
    } finally {
      setBusy(false);
    }
  }

  const hasUnread = unread.length > 0;

  return (
    <>
      <div
        className={
          hasUnread
            ? 'rounded-xl border border-score-1/50 bg-score-1/15 px-4 py-3 flex items-center gap-3 animate-slide-down'
            : 'rounded-xl border border-hana-border bg-elevated px-4 py-3 flex items-center gap-3'
        }
      >
        <AlertTriangle size={20} className={hasUnread ? 'text-score-1 shrink-0' : 'text-text-muted shrink-0'} />
        <div className="flex-1 min-w-0">
          <p className={hasUnread ? 'text-sm font-semibold text-score-1' : 'text-sm text-text-secondary'}>
            {hasUnread
              ? `Anda menerima ${unread.length} Surat Peringatan dari RH.`
              : 'Surat peringatan sudah dibaca.'}
          </p>
        </div>
        <button
          onClick={() => setOpenId((hasUnread ? unread[0] : warnings[0]).id)}
          className={hasUnread ? 'btn-pink !py-2 !px-4 text-xs shrink-0' : 'btn-ghost !py-2 !px-4 text-xs shrink-0'}
        >
          {hasUnread ? 'Baca Sekarang' : 'Lihat'}
        </button>
      </div>

      <Modal
        open={Boolean(active)}
        onClose={() => setOpenId(null)}
        title="⚠️ Surat Peringatan"
        footer={
          active && !active.is_read ? (
            <button onClick={() => handleMarkRead(active.id)} disabled={busy} className="btn-teal w-full">
              <Check size={16} /> Tandai Sudah Dibaca
            </button>
          ) : (
            <p className="text-xs text-text-muted text-center">Surat ini sudah ditandai dibaca.</p>
          )
        }
      >
        {active && (
          <div className="space-y-3">
            <div>
              <h4 className="font-display text-lg font-bold text-score-1">{active.title}</h4>
              <p className="text-xs text-text-muted mt-1">
                Dari: Regional Head · {formatDateID(active.created_at)}
              </p>
            </div>
            <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">{active.message}</p>
          </div>
        )}
      </Modal>
    </>
  );
}
