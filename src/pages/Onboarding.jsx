import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, LogOut, ShieldCheck, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchAllUsers, fetchSupervisors, upsertUserProfile } from '../lib/db';
import { useUnsavedWarning } from '../hooks/useUnsavedWarning';
import { ErrorBox, Spinner } from '../components/ui';
import { ROLE_LABELS, clsx } from '../lib/utils';
import logo from '/hana-bank-logo.png';

const ROLES = ['BM', 'FWSS', 'FA'];
const DEMO_ID_RE = /^[a-z]+_\d+$/;

// Sections atasan yang ditampilkan per role.
// required: wajib pilih ≥1; multi: bisa pilih lebih dari 1; single: pilih tepat 1 (select)
const SUPERVISOR_SECTIONS = {
  FA:   [{ role: 'FWSS', required: true, multi: true }, { role: 'BM', required: true, multi: true }, { role: 'RH', required: true, multi: false }],
  FWSS: [{ role: 'BM',   required: true, multi: true }, { role: 'FA', required: true, multi: true }, { role: 'RH', required: true, multi: false }],
  BM:   [{ role: 'FWSS', required: true, multi: true }, { role: 'FA', required: false, multi: true }, { role: 'RH', required: true, multi: false }],
};


// supSelections: { [role]: string[] }  — RH stored as single-item array too
function initSelections() {
  return { FA: [], FWSS: [], BM: [], RH: [] };
}

export default function Onboarding() {
  const { clerkIdentity, user: existingProfile, refreshProfile, logout, dashboardPath } = useAuth();
  const navigate = useNavigate();
  const isUpdate = Boolean(existingProfile);

  const [name, setName] = useState(existingProfile?.name || clerkIdentity?.fullName || '');
  const [role, setRole] = useState(existingProfile?.role || '');
  const [branch, setBranch] = useState(existingProfile?.branch || '');
  const [supSelections, setSupSelections] = useState(initSelections());
  const [usersByRole, setUsersByRole] = useState({});
  const [usersLoading, setUsersLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  useUnsavedWarning(touched && !saving);

  const sections = SUPERVISOR_SECTIONS[role] || [];

  // Load all users and existing supervisor selections when role changes
  useEffect(() => {
    setSupSelections(initSelections());
    if (!role || role === 'RH') return;
    setUsersLoading(true);
    (async () => {
      try {
        const [allUsers, existing] = await Promise.all([
          fetchAllUsers(),
          isUpdate && clerkIdentity?.id ? fetchSupervisors(clerkIdentity.id) : Promise.resolve([]),
        ]);
        const grouped = {};
        allUsers
          .filter((u) => !DEMO_ID_RE.test(u.id) && u.id !== clerkIdentity?.id)
          .forEach((u) => {
            if (!grouped[u.role]) grouped[u.role] = [];
            grouped[u.role].push(u);
          });
        setUsersByRole(grouped);

        // Pre-fill from existing supervisors if update mode
        if (existing.length > 0) {
          const byRole = initSelections();
          existing.forEach((sup) => {
            if (!byRole[sup.role]) byRole[sup.role] = [];
            byRole[sup.role].push(sup.id);
          });
          setSupSelections(byRole);
        }
      } catch {
        setUsersByRole({});
      } finally {
        setUsersLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  function toggleMulti(sectionRole, userId) {
    setTouched(true);
    setSupSelections((prev) => {
      const cur = prev[sectionRole] || [];
      return {
        ...prev,
        [sectionRole]: cur.includes(userId) ? cur.filter((id) => id !== userId) : [...cur, userId],
      };
    });
  }

  function setSingle(sectionRole, userId) {
    setTouched(true);
    setSupSelections((prev) => ({ ...prev, [sectionRole]: userId ? [userId] : [] }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Nama lengkap wajib diisi.');
    if (!role) return setError('Pilih role Anda.');
    if (!branch) return setError('Pilih cabang Anda.');

    // Validasi setiap section
    for (const sec of sections) {
      const selected = supSelections[sec.role] || [];
      if (sec.required && selected.length === 0) {
        return setError(`Pilih minimal 1 ${sec.role} (${ROLE_LABELS[sec.role] || sec.role}).`);
      }
    }

    // Flatten semua pilihan menjadi satu array supervisor IDs
    const supervisorIds = sections.flatMap((sec) => supSelections[sec.role] || []);

    setSaving(true);
    try {
      await upsertUserProfile({
        id: clerkIdentity.id,
        name: name.trim(),
        role,
        branch,
        supervisorIds,
      });
      setTouched(false);
      await refreshProfile();
      navigate(dashboardPath(role), { replace: true });
    } catch (err) {
      setError(err.message || 'Gagal menyimpan profil.');
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
          <h1 className="font-display text-2xl font-bold">
            {isUpdate ? 'Perbarui Profil' : 'Lengkapi Profil Anda'}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {isUpdate
              ? 'Perbarui data profil atau pilih ulang atasan Anda.'
              : 'Beberapa data dibutuhkan untuk menempatkan Anda di struktur tim ICU Class.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && <ErrorBox>{error}</ErrorBox>}

          <div>
            <label className="label">Email</label>
            <input className="w-full px-3 py-2 text-sm bg-elevated" value={clerkIdentity?.email || ''} readOnly disabled />
          </div>

          <div>
            <label className="label">Nama Lengkap *</label>
            <input
              className="w-full px-3 py-2 text-sm"
              value={name}
              onChange={(e) => { setTouched(true); setName(e.target.value); }}
              placeholder="Nama sesuai identitas"
            />
          </div>

          <div>
            <label className="label">Role / Jabatan *</label>
            <select className="w-full px-3 py-2 text-sm" value={role} onChange={(e) => { setTouched(true); setRole(e.target.value); }}>
              <option value="">— Pilih role —</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Cabang / Unit *</label>
            <input
              className="w-full px-3 py-2 text-sm"
              value={branch}
              onChange={(e) => { setTouched(true); setBranch(e.target.value); }}
              placeholder="mis. Cabang Jakarta Pusat"
            />
          </div>

          {role && sections.length > 0 && (
            <div className="space-y-4">
              {usersLoading ? (
                <div className="flex items-center gap-2 text-sm text-text-muted py-2">
                  <Spinner size={16} /> Memuat daftar pengguna...
                </div>
              ) : (
                sections.map((sec) => {
                  const candidates = (usersByRole[sec.role] || []).sort((a, b) => a.name.localeCompare(b.name));
                  const selected = supSelections[sec.role] || [];
                  return (
                    <div key={sec.role}>
                      <label className="label mb-1.5">
                        {ROLE_LABELS[sec.role] || sec.role} ({sec.role})
                        {sec.required ? <span className="text-score-1 ml-1">*</span> : <span className="text-text-muted ml-1 font-normal">(opsional)</span>}
                      </label>
                      {candidates.length === 0 ? (
                        <p className="text-xs text-text-muted bg-elevated border border-hana-border rounded-lg px-3 py-2">
                          Belum ada {sec.role} terdaftar — bisa dikaitkan nanti.
                        </p>
                      ) : sec.multi ? (
                        <div className="flex flex-wrap gap-2">
                          {candidates.map((u) => {
                            const active = selected.includes(u.id);
                            return (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => toggleMulti(sec.role, u.id)}
                                className={clsx(
                                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                                  active
                                    ? 'bg-hana-teal-500 text-white border-hana-teal-500'
                                    : 'bg-white text-text-secondary border-hana-border hover:border-hana-teal-400'
                                )}
                              >
                                {active && <Check size={11} />}
                                {u.name} · {u.branch}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        // Single select (RH)
                        <select
                          className="w-full px-3 py-2 text-sm"
                          value={selected[0] || ''}
                          onChange={(e) => setSingle(sec.role, e.target.value)}
                        >
                          <option value="">— Pilih {sec.role} —</option>
                          {candidates.map((u) => (
                            <option key={u.id} value={u.id}>{u.name} · {u.branch}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          <button type="submit" disabled={saving} className="btn-teal w-full">
            {saving ? <Spinner size={16} className="text-white" /> : <UserPlus size={16} />}
            {isUpdate ? 'Simpan Perubahan' : 'Simpan & Masuk'}
          </button>
          {isUpdate && (
            <button type="button" onClick={() => navigate(dashboardPath(role || existingProfile?.role), { replace: true })} className="btn-ghost w-full">
              Batal
            </button>
          )}
        </form>

        <p className="flex items-center gap-1.5 text-[11px] text-text-muted mt-5 justify-center">
          <ShieldCheck size={13} /> Data Anda tersimpan aman
        </p>
      </main>
    </div>
  );
}
