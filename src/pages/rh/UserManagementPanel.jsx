import { useState } from 'react';
import { Pencil, Trash2, X, Check } from 'lucide-react';
import { updateUser, deleteUser } from '../../lib/db';
import { ROLE_LABELS, clsx } from '../../lib/utils';
import { Modal, ErrorBox, Spinner } from '../../components/ui';

const ROLES = ['RH', 'BM', 'FWSS', 'FA'];

const SUPERVISOR_ROLE = {
  FA: 'FWSS',
  FWSS: 'BM',
  BM: 'RH',
  RH: null,
};

function EditModal({ user, allUsers, onSave, onClose }) {
  const [form, setForm] = useState({
    name: user.name || '',
    role: user.role || 'FA',
    branch: user.branch || '',
    supervisorId: user.supervisor_id || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const supervisorRole = SUPERVISOR_ROLE[form.role];
  const potentialSupervisors = supervisorRole
    ? allUsers.filter((u) => u.role === supervisorRole && u.id !== user.id)
    : [];

  async function handleSave() {
    if (!form.name.trim()) return setError('Nama tidak boleh kosong.');
    setSaving(true);
    setError('');
    try {
      const updated = await updateUser(user.id, {
        name: form.name.trim(),
        role: form.role,
        branch: form.branch.trim(),
        supervisorId: form.supervisorId || null,
      });
      onSave(updated);
    } catch (e) {
      setError(e.message || 'Gagal menyimpan perubahan.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Edit Data User"
      maxWidth="max-w-md"
      footer={
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onClose} className="btn-ghost" disabled={saving}>
            <X size={16} /> Batal
          </button>
          <button onClick={handleSave} className="btn-teal" disabled={saving}>
            {saving ? <Spinner size={16} className="text-white" /> : <Check size={16} />} Simpan
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        {error && <ErrorBox>{error}</ErrorBox>}

        <div>
          <label className="label">Nama</label>
          <input
            className="w-full px-3 py-2 text-sm"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>

        <div>
          <label className="label">Role</label>
          <select
            className="w-full px-3 py-2 text-sm"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value, supervisorId: '' }))}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{r} — {ROLE_LABELS[r]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Cabang / Unit</label>
          <input
            className="w-full px-3 py-2 text-sm"
            value={form.branch}
            onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))}
            placeholder="mis. Cabang Jakarta Pusat"
          />
        </div>

        {supervisorRole && (
          <div>
            <label className="label">Atasan ({supervisorRole})</label>
            <select
              className="w-full px-3 py-2 text-sm"
              value={form.supervisorId}
              onChange={(e) => setForm((f) => ({ ...f, supervisorId: e.target.value }))}
            >
              <option value="">— Tidak ada —</option>
              {potentialSupervisors.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.branch})</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </Modal>
  );
}

function DeleteModal({ user, onConfirm, onClose }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    setDeleting(true);
    setError('');
    try {
      await deleteUser(user.id);
      onConfirm();
    } catch (e) {
      setError(e.message || 'Gagal menghapus user.');
      setDeleting(false);
    }
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Hapus User"
      maxWidth="max-w-sm"
      footer={
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onClose} className="btn-ghost" disabled={deleting}>
            Batal
          </button>
          <button onClick={handleDelete} disabled={deleting} className="btn-pink">
            {deleting ? <Spinner size={16} className="text-white" /> : <Trash2 size={16} />} Hapus
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        {error && <ErrorBox>{error}</ErrorBox>}
        <p className="text-sm">
          Hapus akun <span className="font-semibold">{user.name}</span> ({user.role})?
        </p>
        <p className="text-xs text-score-1 bg-score-1/10 border border-score-1/30 rounded-lg px-3 py-2">
          Semua data aktivitas, rencana, dan skor user ini akan dihapus permanen dan tidak bisa dipulihkan.
        </p>
      </div>
    </Modal>
  );
}

export default function UserManagementPanel({ users, onRefresh }) {
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const sorted = [...users].sort((a, b) => {
    const order = { RH: 0, BM: 1, FWSS: 2, FA: 3 };
    return (order[a.role] ?? 9) - (order[b.role] ?? 9) || a.name.localeCompare(b.name);
  });

  function handleSaved(updated) {
    setEditTarget(null);
    onRefresh();
  }

  function handleDeleted() {
    setDeleteTarget(null);
    onRefresh();
  }

  return (
    <>
      <div className="card !p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-text-muted border-b border-hana-border bg-elevated">
              <th className="px-4 py-3 font-semibold">Nama</th>
              <th className="px-3 py-3 font-semibold hidden sm:table-cell">Cabang</th>
              <th className="px-3 py-3 font-semibold">Role</th>
              <th className="px-3 py-3 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((u) => (
              <tr key={u.id} className="border-b border-hana-border/70 last:border-0 hover:bg-elevated transition-colors">
                <td className="px-4 py-3">
                  <p className="font-semibold leading-tight">{u.name}</p>
                  <p className="text-[10px] text-text-muted sm:hidden">{u.branch}</p>
                </td>
                <td className="px-3 py-3 text-text-secondary text-xs hidden sm:table-cell">{u.branch || '—'}</td>
                <td className="px-3 py-3">
                  <span className={clsx(
                    'inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold',
                    u.role === 'RH' ? 'bg-hana-pink-50 text-hana-pink-600' :
                    u.role === 'BM' ? 'bg-hana-teal-50 text-hana-teal-700' :
                    'bg-elevated text-text-secondary'
                  )}>
                    {u.role}
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => setEditTarget(u)}
                      className="p-1.5 rounded-lg border border-hana-border hover:border-hana-teal-500 hover:text-hana-teal-700 transition-colors"
                      title="Edit user"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(u)}
                      className="p-1.5 rounded-lg border border-hana-border hover:border-score-1 hover:text-score-1 transition-colors"
                      title="Hapus user"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <div className="py-10 text-center text-text-muted text-sm">Tidak ada user terdaftar.</div>
        )}
      </div>

      {editTarget && (
        <EditModal
          user={editTarget}
          allUsers={users}
          onSave={handleSaved}
          onClose={() => setEditTarget(null)}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          user={deleteTarget}
          onConfirm={handleDeleted}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
