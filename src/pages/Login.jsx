import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchAllUsers } from '../lib/db';
import { isSupabaseConfigured } from '../lib/supabase';
import UserCard from '../components/UserCard';
import { FullSpinner, ErrorBox } from '../components/ui';
import logo from '/hana-bank-logo.png';

const DEMO_PASSWORD = 'icu2026';

// Fallback users (dipakai bila Supabase belum dikonfigurasi)
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

const ROLE_ORDER = { RH: 0, BM: 1, FWSS: 2, FA: 3 };

export default function Login() {
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

  const sorted = [...users].sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9));

  return (
    <div className="min-h-screen bg-charcoal">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex flex-col items-center text-center mb-8">
          <img src={logo} alt="Bank Hana" className="h-16 w-16 mb-3" />
          <h1 className="font-display text-3xl font-extrabold tracking-tight">ICU CLASS</h1>
          <p className="text-hana-teal-500 font-display font-bold text-sm tracking-wide">BANK HANA</p>
          <p className="text-xs text-text-muted mt-1">Intensive Control &amp; Upgrading — Field Execution System</p>
        </div>

        {error && <div className="mb-4"><ErrorBox>{error}</ErrorBox></div>}

        {loading ? (
          <FullSpinner label="Memuat daftar user..." />
        ) : (
          <>
            <p className="text-sm text-text-secondary mb-3 text-center">
              Pilih user untuk masuk (mode demo — klik langsung login)
            </p>
            <div className="grid grid-cols-2 gap-3">
              {sorted.map((u) => (
                <UserCard key={u.id} user={u} onClick={doLogin} />
              ))}
            </div>

            <details className="mt-8 group">
              <summary className="cursor-pointer text-sm text-text-secondary hover:text-white text-center list-none">
                <span className="underline underline-offset-4">Login manual (username + password)</span>
              </summary>
              <form onSubmit={handleManual} className="card mt-3 max-w-sm mx-auto space-y-3">
                <div>
                  <label className="label">Username / ID</label>
                  <input
                    className="w-full px-3 py-2 text-sm"
                    placeholder="fa_001"
                    value={manual.username}
                    onChange={(e) => setManual((m) => ({ ...m, username: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Password</label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 text-sm"
                    placeholder="icu2026"
                    value={manual.password}
                    onChange={(e) => setManual((m) => ({ ...m, password: e.target.value }))}
                  />
                </div>
                {manualErr && <p className="text-xs text-score-1">{manualErr}</p>}
                <button type="submit" className="btn-teal w-full">
                  <LogIn size={16} /> Masuk
                </button>
              </form>
            </details>
          </>
        )}

        <p className="text-center text-[11px] text-text-muted mt-10">ICU Class v4.0 · Bank Hana © 2026</p>
      </div>
    </div>
  );
}
