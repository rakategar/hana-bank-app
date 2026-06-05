import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchAllUsers } from '../lib/db';
import { isSupabaseConfigured } from '../lib/supabase';
import UserCard from '../components/UserCard';
import { FullSpinner, ErrorBox } from '../components/ui';
import { ROLE_LABELS } from '../lib/utils';

const DEMO_PASSWORD = 'icu2026';

const FALLBACK_USERS = [
  { id: 'rh_001', name: 'Budi Hartono', role: 'RH', branch: 'Regional Jakarta', supervisor_id: null },
  { id: 'bm_001', name: 'Drs. Agus Salim', role: 'BM', branch: 'Regional Jakarta', supervisor_id: 'rh_001' },
  { id: 'fwss_001', name: 'Hendra Wijaya', role: 'FWSS', branch: 'Cabang Jakarta Pusat', supervisor_id: 'bm_001' },
  { id: 'fwss_002', name: 'Maya Sari', role: 'FWSS', branch: 'Cabang Jakarta Selatan', supervisor_id: 'bm_001' },
  { id: 'fa_001', name: 'Andi Pratama', role: 'FA', branch: 'Cabang Jakarta Pusat', supervisor_id: 'fwss_001' },
  { id: 'fa_002', name: 'Sari Dewi', role: 'FA', branch: 'Cabang Jakarta Pusat', supervisor_id: 'fwss_001' },
  { id: 'fa_003', name: 'Budi Santoso', role: 'FA', branch: 'Cabang Jakarta Selatan', supervisor_id: 'fwss_002' },
  { id: 'fa_004', name: 'Rina Marlina', role: 'FA', branch: 'Cabang Jakarta Selatan', supervisor_id: 'fwss_002' },
];

// Login demo: kartu user dikelompokkan per role (one-click) + form manual. Dipakai saat VITE_APP_MODE=demo.
export default function DemoLogin() {
  const { login, dashboardPath } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [manual, setManual] = useState({ username: '', password: '' });
  const [manualErr, setManualErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        if (isSupabaseConfigured) {
          const data = await fetchAllUsers();
          setUsers(data.length ? data : FALLBACK_USERS);
        } else {
          setUsers(FALLBACK_USERS);
        }
      } catch (e) {
        setError('Gagal memuat user dari Supabase, memakai data demo. ' + (e.message || ''));
        setUsers(FALLBACK_USERS);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function doLogin(user) {
    login(user);
    navigate(dashboardPath(user.role), { replace: true });
  }

  function handleManual(e) {
    e.preventDefault();
    setManualErr('');
    const found = users.find(
      (u) => u.id.toLowerCase() === manual.username.trim().toLowerCase() ||
        u.name.toLowerCase() === manual.username.trim().toLowerCase()
    );
    if (!found) return setManualErr('User tidak ditemukan. Gunakan ID seperti fa_001.');
    if (manual.password !== DEMO_PASSWORD) return setManualErr('Password salah. (Demo: icu2026)');
    doLogin(found);
  }

  // Kelompokkan per role, urut RH → BM → FWSS → FA.
  const roleGroups = ['RH', 'BM', 'FWSS', 'FA']
    .map((role) => ({ role, list: users.filter((u) => u.role === role) }))
    .filter((g) => g.list.length > 0);

  return (
    <>
      <div className="mb-6 text-center">
        <h2 className="font-display text-2xl font-bold">Masuk (Mode Demo)</h2>
        <p className="text-sm text-text-secondary mt-1">Klik salah satu kartu untuk langsung masuk.</p>
      </div>

      {error && <div className="mb-4"><ErrorBox>{error}</ErrorBox></div>}

      {loading ? (
        <FullSpinner label="Memuat daftar user..." />
      ) : (
        <>
          <div className="space-y-5">
            {roleGroups.map(({ role, list }) => (
              <div key={role}>
                <div className="flex items-center justify-center gap-2 mb-2.5">
                  <span className="text-xs font-display font-bold uppercase tracking-wide text-text-secondary">{ROLE_LABELS[role] || role}</span>
                  <span className="text-[10px] font-semibold text-hana-teal-700 bg-hana-teal-50 rounded-full px-2 py-0.5">{role}</span>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  {list.map((u) => (
                    <div key={u.id} className="w-44">
                      <UserCard user={u} onClick={doLogin} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <details className="mt-6 group">
            <summary className="cursor-pointer text-sm text-text-secondary hover:text-ink list-none">
              <span className="underline underline-offset-4">Login manual (username + password)</span>
            </summary>
            <form onSubmit={handleManual} className="card mt-3 space-y-3">
              <div>
                <label className="label">Username / ID</label>
                <input className="w-full px-3 py-2 text-sm" placeholder="fa_001" value={manual.username} onChange={(e) => setManual((m) => ({ ...m, username: e.target.value }))} />
              </div>
              <div>
                <label className="label">Password</label>
                <input type="password" className="w-full px-3 py-2 text-sm" placeholder="icu2026" value={manual.password} onChange={(e) => setManual((m) => ({ ...m, password: e.target.value }))} />
              </div>
              {manualErr && <p className="text-xs text-score-1">{manualErr}</p>}
              <button type="submit" className="btn-teal w-full"><LogIn size={16} /> Masuk</button>
            </form>
          </details>
        </>
      )}
    </>
  );
}
