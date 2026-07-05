import { useState } from 'react';
import { ShieldCheck, X, Eye, EyeOff, Loader2 } from 'lucide-react';
import { SignIn } from '@clerk/react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { validateManualLogin } from '../lib/db';
import { setManualSession } from '../lib/manualSession';
import { setUserContext } from '../lib/supabase';
import logo from '/hana-bank-logo.png';

function MobileInstallBanner() {
  const { prompt, isIos, isStandalone, triggerInstall } = useInstallPrompt();
  const [showHint, setShowHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (isStandalone || dismissed) return null;

  const isAndroid = !isIos && /android/i.test(navigator.userAgent);
  const isMobile = isIos || isAndroid;
  if (!isMobile) return null;

  const platform = isIos ? 'iPhone & iPad' : 'Android';

  function handleInstall() {
    if (prompt) {
      triggerInstall();
    } else {
      setShowHint(true);
    }
  }

  return (
    <>
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-hana-border shadow-elevated">
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img src={logo} alt="ICU Class" className="h-10 w-10 rounded-xl shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">Dapatkan ICU Class</p>
                <p className="text-xs text-text-secondary">Untuk {platform}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={handleInstall} className="btn-teal text-xs px-3 py-1.5">
                Install
              </button>
              <button onClick={() => setDismissed(true)} className="text-text-muted hover:text-ink p-1">
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom sheet panduan install */}
      {showHint && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setShowHint(false)} />
          <div className="relative w-full bg-white rounded-t-2xl p-6 shadow-elevated">
            <div className="flex items-center gap-3 mb-5">
              <img src={logo} alt="ICU Class" className="h-12 w-12 rounded-2xl" />
              <div>
                <h3 className="font-display text-lg font-bold">Install ICU Class</h3>
                <p className="text-xs text-text-secondary">Untuk {platform}</p>
              </div>
            </div>
            <ol className="space-y-3 text-sm text-text-secondary">
              {(isIos ? [
                <>Buka halaman ini di <b className="text-ink">Safari</b></>,
                <>Tap ikon <b className="text-ink">Bagikan</b> (□↑) di bawah layar</>,
                <>Pilih <b className="text-ink">"Tambah ke Layar Utama"</b></>,
                <>Tap <b className="text-ink">Tambah</b></>,
              ] : [
                <>Buka halaman ini di <b className="text-ink">Chrome</b></>,
                <>Tap menu <b className="text-ink">⋮</b> di pojok kanan atas</>,
                <>Pilih <b className="text-ink">"Tambahkan ke layar utama"</b></>,
                <>Tap <b className="text-ink">Tambahkan</b></>,
              ]).map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="h-6 w-6 rounded-full bg-hana-teal-500 text-white text-xs font-bold grid place-items-center shrink-0">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <button onClick={() => setShowHint(false)} className="btn-teal w-full mt-6">Mengerti</button>
          </div>
        </div>
      )}
    </>
  );
}

const clerkAppearance = {
  variables: {
    colorPrimary: '#04B292',
    colorText: '#1F2933',
    colorBackground: '#FFFFFF',
    colorInputBackground: '#FFFFFF',
    colorInputText: '#1F2933',
    borderRadius: '0.5rem',
    fontFamily: '"DM Sans", sans-serif',
    fontSize: '14px',
  },
  elements: {
    rootBox: 'w-full',
    card: 'shadow-none border-0 bg-transparent p-0 m-0',
    header: 'hidden',
    footer: 'hidden',
    main: 'p-0 m-0 gap-0',
    dividerRow: 'hidden',
    formFieldRow: 'hidden',
    formButtonRow: 'hidden',
    socialButtonsProviders: 'gap-0',
    socialButtonsBlockButton:
      'w-full border border-[#E2E8F0] bg-white hover:bg-[#F1F5F9] text-[#1F2933] font-medium rounded-lg h-11 text-sm shadow-[0_1px_2px_rgba(16,24,40,0.04)]',
    socialButtonsBlockButtonText: 'font-medium text-sm',
  },
};

function ManualLoginForm({ onClose }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setError('');
    setLoading(true);
    try {
      const user = await validateManualLogin(username, password);
      setManualSession(user);
      setUserContext(user.id);
      // reload agar AuthContext re-initialize
      window.location.reload();
    } catch (err) {
      setError(err.message || 'Login gagal. Periksa username dan password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 w-full">
      <div className="rounded-xl border border-hana-border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-ink">Login Manual</p>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-ink transition-colors"
            aria-label="Tutup"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username"
              autoComplete="username"
              className="w-full h-10 px-3 rounded-lg border border-hana-border text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-hana-teal-500/40 focus:border-hana-teal-500 transition-colors"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                autoComplete="current-password"
                className="w-full h-10 px-3 pr-10 rounded-lg border border-hana-border text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-hana-teal-500/40 focus:border-hana-teal-500 transition-colors"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-ink transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className="w-full h-10 rounded-lg bg-hana-teal-500 text-white text-sm font-semibold hover:bg-hana-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Login() {
  const [showManualForm, setShowManualForm] = useState(false);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <MobileInstallBanner />
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
            {['Financial Advisor', 'FWSS', 'Branch Manager', 'Regional Head'].map((r) => (
              <span key={r} className="px-3 py-1 rounded-full bg-white/10 text-xs font-medium">{r}</span>
            ))}
          </div>
        </div>
        <p className="relative text-[11px] text-white/40">v4.0 · Bank Hana © 2026</p>
      </div>

      {/* Auth panel */}
      <div className="flex flex-col bg-charcoal min-h-screen lg:min-h-0">
        <div className="flex-1 w-full mx-auto px-5 py-10 pb-28 lg:pb-10 flex flex-col justify-center max-w-md">
          <div className="lg:hidden flex flex-col items-center text-center mb-6">
            <img src={logo} alt="Bank Hana" className="h-14 w-14 mb-2" />
            <h1 className="font-display text-2xl font-extrabold">ICU CLASS</h1>
            <p className="text-hana-teal-600 font-display font-bold text-sm">BANK HANA</p>
          </div>

          <div className="mb-5 text-center">
            <p className="text-base text-text-secondary">Masuk atau daftar dengan akun Google Anda untuk melanjutkan</p>
          </div>

          <SignIn appearance={clerkAppearance} routing="hash" signUpUrl="#/sign-up" />

          {/* Login Manual */}
          {!showManualForm ? (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowManualForm(true)}
                className="text-xs text-text-muted hover:text-text-secondary underline underline-offset-2 transition-colors"
              >
                login manual
              </button>
            </div>
          ) : (
            <ManualLoginForm onClose={() => setShowManualForm(false)} />
          )}

          <p className="flex items-center gap-1.5 text-[11px] text-text-muted mt-6 justify-center">
            <ShieldCheck size={13} /> Autentikasi aman oleh Clerk
          </p>
        </div>
      </div>
    </div>
  );
}
