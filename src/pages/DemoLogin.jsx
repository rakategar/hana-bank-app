import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, UsersRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchAllUsers } from '../lib/db';
import { isSupabaseConfigured } from '../lib/supabase';
import UserCard from '../components/UserCard';
import { ErrorBox } from '../components/ui';
import ManualLoginForm from '../components/login/ManualLoginForm';
import UnderlineTabs from '../components/login/UnderlineTabs';
import UserCardSkeletonGrid from '../components/login/UserCardSkeletonGrid';

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

const ROLE_ORDER = { RH: 0, BM: 1, FWSS: 2, FA: 3 };
const LOGIN_TABS = [
  { value: 'demo', label: 'Mode Demo', icon: UsersRound },
  { value: 'manual', label: 'Login Manual', icon: KeyRound },
];

// Login demo: grid 8 user (one-click) + form manual. Dipakai saat VITE_APP_MODE=demo.
export default function DemoLogin() {
  const { login, dashboardPath } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [manual, setManual] = useState({ username: '', password: '' });
  const [manualErr, setManualErr] = useState('');
  const [activeTab, setActiveTab] = useState('demo');

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
    <>
      <div className="mb-5">
        <h2 className="font-display text-2xl font-extrabold leading-none text-ink">Masuk (Mode Demo)</h2>
        <p className="mt-1 text-sm text-text-secondary">
          {activeTab === 'demo' ? 'Pilih user untuk langsung masuk.' : 'Masuk manual memakai ID dan password demo.'}
        </p>
      </div>

      {error && <div className="mb-4"><ErrorBox>{error}</ErrorBox></div>}

      <UnderlineTabs tabs={LOGIN_TABS} activeValue={activeTab} onChange={setActiveTab} />

      {loading ? (
        <UserCardSkeletonGrid />
      ) : (
        <>
          <div className="min-h-[292px]">
            {activeTab === 'demo' ? (
              <div key="demo-panel" className="animate-fade-in-up grid h-full max-h-[430px] grid-cols-1 content-start gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                {sorted.map((u) => (
                  <UserCard key={u.id} user={u} onClick={doLogin} />
                ))}
              </div>
            ) : (
              <ManualLoginForm
                credentials={manual}
                error={manualErr}
                onSubmit={handleManual}
                onChange={(patch) => setManual((current) => ({ ...current, ...patch }))}
              />
            )}
          </div>
        </>
      )}
    </>
  );
}
