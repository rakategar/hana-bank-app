import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { fetchUsersByRole, upsertUserProfile } from '../lib/db';
import { Spinner } from '../components/ui';
import { ROLE_LABELS } from '../lib/utils';
import logo from '/hana-bank-logo.png';

const ROLES = ['RH', 'BM', 'FWSS', 'FA'];

// Role atasan untuk tiap role (top-down). RH tidak punya atasan.
const SUPERVISOR_ROLE = { BM: 'RH', FWSS: 'BM', FA: 'FWSS' };

const BRANCHES = [
  'Regional Jakarta',
  'Cabang Jakarta Pusat',
  'Cabang Jakarta Selatan',
  'Cabang Jakarta Barat',
  'Cabang Jakarta Timur',
  'Cabang Jakarta Utara',
];

export default function Onboarding() {
  const { clerkIdentity, refreshProfile, logout, dashboardPath } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(clerkIdentity?.fullName || '');
  const [role, setRole] = useState('');
  const [branch, setBranch] = useState('');
  const [supervisorId, setSupervisorId] = useState('');
  const [supervisors, setSupervisors] = useState([]);
  const [supLoading, setSupLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const supRole = SUPERVISOR_ROLE[role];

  // Muat kandidat atasan saat role berubah
  useEffect(() => {
    setSupervisorId('');
    setSupervisors([]);
    if (!supRole) return;
    setSupLoading(true);
    (async () => {
      try {
        setSupervisors(await fetchUsersByRole(supRole));
      } catch {
        setSupervisors([]);
      } finally {
        setSupLoading(false);
      }
    })();
  }, [supRole]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return toast.error('Nama lengkap wajib diisi.');
    if (!role) return toast.error('Pilih role Anda.');
    if (!branch) return toast.error('Pilih cabang Anda.');

    setSaving(true);
    try {
      await upsertUserProfile({
        id: clerkIdentity.id,
        name: name.trim(),
        role,
        branch,
        supervisorId: supervisorId || null,
      });
      await refreshProfile();
      navigate(dashboardPath(role), { replace: true });
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan profil.');
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-screen bg-charcoal flex flex-col">
      <header className="h-16 px-5 flex items-center justify-between border-b border-hana-border bg-white">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="Bank Hana" className="h-8 w-8" />
          <div className="leading-tight">
            <p className="font-display text-base font-bold">ICU Class</p>
            <p className="text-[10px] text-text-muted -mt-0.5">Bank Hana</p>
          </div>
        </div>
        <button onClick={handleLogout} className="text-text-secondary hover:text-score-1 inline-flex items-center gap-1.5 text-sm">
          <LogOut size={16} /> Keluar
        </button>
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto px-5 py-8 flex flex-col justify-center">
        <div className="text-center mb-6">
          <div className="h-14 w-14 rounded-full bg-hana-teal-50 grid place-items-center mx-auto mb-3">
            <UserPlus size={26} className="text-hana-teal-700" />
          </div>
          <h1 className="font-display text-2xl font-bold">Lengkapi Profil Anda</h1>
          <p className="text-sm text-text-secondary mt-1">
            Beberapa data dibutuhkan untuk menempatkan Anda di struktur tim ICU Class.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">

          <div>
            <label className="label">Email</label>
            <input className="w-full px-3 py-2 text-sm bg-elevated" value={clerkIdentity?.email || ''} readOnly disabled />
          </div>

          <div>
            <label className="label">Nama Lengkap *</label>
            <input
              className="w-full px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama sesuai identitas"
            />
          </div>

          <div>
            <label className="label">Role / Jabatan *</label>
            <select className="w-full px-3 py-2 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">— Pilih role —</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r} — {ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Cabang / Unit *</label>
            <select className="w-full px-3 py-2 text-sm" value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value="">— Pilih cabang —</option>
              {BRANCHES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {supRole && (
            <div>
              <label className="label">Atasan ({ROLE_LABELS[supRole]})</label>
              {supLoading ? (
                <div className="flex items-center gap-2 text-sm text-text-muted py-2"><Spinner size={16} /> Memuat daftar {supRole}...</div>
              ) : supervisors.length > 0 ? (
                <select className="w-full px-3 py-2 text-sm" value={supervisorId} onChange={(e) => setSupervisorId(e.target.value)}>
                  <option value="">— Pilih atasan —</option>
                  {supervisors.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} · {s.branch}</option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-text-muted bg-elevated border border-hana-border rounded-lg px-3 py-2">
                  Belum ada {supRole} terdaftar — bisa dikaitkan nanti setelah atasan Anda mendaftar.
                </p>
              )}
            </div>
          )}

          {role === 'RH' && (
            <p className="text-xs text-text-muted">Sebagai Regional Head, Anda berada di puncak struktur (tanpa atasan).</p>
          )}

          <button type="submit" disabled={saving} className="btn-teal w-full">
            {saving ? <Spinner size={16} className="text-white" /> : <UserPlus size={16} />}
            Simpan & Masuk
          </button>
        </form>

        <p className="flex items-center gap-1.5 text-[11px] text-text-muted mt-5 justify-center">
          <ShieldCheck size={13} /> Data Anda tersimpan aman
        </p>
      </main>
    </div>
  );
}
