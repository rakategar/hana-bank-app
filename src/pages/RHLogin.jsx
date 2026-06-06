import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, ArrowLeft } from 'lucide-react';
import { validateRHLogin } from '../lib/db';
import { setRHSession } from '../lib/rhSession';
import { ErrorBox, Spinner } from '../components/ui';
import logo from '/hana-bank-logo.png';

export default function RHLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!username.trim()) return setError('Username wajib diisi.');
    if (!password) return setError('Password wajib diisi.');

    setLoading(true);
    try {
      const rhUser = await validateRHLogin(username, password);
      setRHSession(rhUser);
      navigate('/dashboard/rh', { replace: true });
    } catch (err) {
      setError(err.message || 'Login gagal.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-sidebar text-white overflow-hidden">
        <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-hana-teal-500/20 blur-3xl" />
        <div className="absolute bottom-0 -left-20 h-72 w-72 rounded-full bg-hana-pink-500/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <img src={logo} alt="Bank Hana" className="h-11 w-11 bg-white rounded-xl p-1.5" />
          <div>
            <p className="font-display text-2xl font-extrabold leading-none">ICU Class</p>
            <p className="text-xs text-white/60">Bank Hana</p>
          </div>
        </div>
        <div className="relative">
          <h1 className="font-display text-4xl font-extrabold leading-tight text-white">
            Intensive Control<br />&amp; Upgrading
          </h1>
          <p className="text-white/70 mt-3 max-w-md">
            Field Execution System untuk tracking aktivitas harian, scoring AI, dan
            monitoring performa tim sales lapangan secara berjenjang.
          </p>
          <div className="flex gap-2 mt-6 flex-wrap">
            {['Regional Head'].map((r) => (
              <span key={r} className="px-3 py-1 rounded-full bg-white/10 text-xs font-medium">{r}</span>
            ))}
          </div>
        </div>
        <p className="relative text-[11px] text-white/40">v4.0 · Bank Hana © 2026</p>
      </div>

      {/* Login panel */}
      <div className="flex flex-col bg-charcoal min-h-screen lg:min-h-0">
        <div className="flex-1 w-full mx-auto px-5 py-10 flex flex-col justify-center max-w-md">
          <div className="lg:hidden flex flex-col items-center text-center mb-6">
            <img src={logo} alt="Bank Hana" className="h-14 w-14 mb-2" />
            <h1 className="font-display text-2xl font-extrabold">ICU CLASS</h1>
            <p className="text-hana-teal-600 font-display font-bold text-sm">BANK HANA</p>
          </div>

          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold">Login Regional Head</h2>
            <p className="text-sm text-text-secondary mt-1">
              Masukkan username dan password untuk akses dashboard RH.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="card space-y-4">
            {error && <ErrorBox>{error}</ErrorBox>}

            <div>
              <label className="label">Username</label>
              <input
                type="text"
                className="w-full px-3 py-2 text-sm"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                disabled={loading}
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="w-full px-3 py-2 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                disabled={loading}
              />
            </div>

            <button type="submit" disabled={loading} className="btn-teal w-full">
              {loading ? <Spinner size={16} className="text-white" /> : <LogIn size={16} />}
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <button
            onClick={() => navigate('/')}
            className="mt-4 w-full flex items-center justify-center gap-2 text-sm text-text-secondary hover:text-ink transition-colors"
          >
            <ArrowLeft size={16} /> Kembali ke Login Utama
          </button>
        </div>
      </div>
    </div>
  );
}
