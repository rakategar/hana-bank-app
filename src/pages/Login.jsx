import { ShieldCheck } from 'lucide-react';
import { SignIn } from '@clerk/react';
import { IS_DEMO } from '../lib/appMode';
import DemoLogin from './DemoLogin';
import logo from '/hana-bank-logo.png';

// Tampilan Clerk disesuaikan dengan brand (teal) — Google-only diatur di dashboard Clerk.
const clerkAppearance = {
  variables: {
    colorPrimary: '#04B292',
    colorText: '#1F2933',
    colorBackground: '#FFFFFF',
    borderRadius: '0.625rem',
    fontFamily: '"DM Sans", sans-serif',
  },
  elements: {
    rootBox: 'w-full',
    card: 'shadow-none border-0 bg-transparent',
    headerTitle: 'font-display',
    socialButtonsBlockButton:
      'border-hana-border hover:bg-elevated text-ink font-medium',
    footer: 'hidden',
  },
};

export default function Login() {
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
            {['Financial Advisor', 'FWSS', 'Branch Manager', 'Regional Head'].map((r) => (
              <span key={r} className="px-3 py-1 rounded-full bg-white/10 text-xs font-medium">{r}</span>
            ))}
          </div>
        </div>
        <p className="relative text-[11px] text-white/40">v4.0 · Bank Hana © 2026</p>
      </div>

      {/* Auth panel */}
      <div className="flex flex-col bg-charcoal min-h-screen lg:min-h-0">
        <div className={`flex-1 w-full mx-auto px-5 py-10 flex flex-col justify-center ${IS_DEMO ? 'max-w-2xl' : 'max-w-md'}`}>
          <div className="lg:hidden flex flex-col items-center text-center mb-6">
            <img src={logo} alt="Bank Hana" className="h-14 w-14 mb-2" />
            <h1 className="font-display text-2xl font-extrabold">ICU CLASS</h1>
            <p className="text-hana-teal-600 font-display font-bold text-sm">BANK HANA</p>
          </div>

          {IS_DEMO ? (
            <DemoLogin />
          ) : (
            <>
              <div className="mb-5">
                <h2 className="font-display text-2xl font-bold">Masuk ke Akun Anda</h2>
                <p className="text-sm text-text-secondary mt-1">
                  Masuk atau daftar menggunakan akun Google Anda untuk melanjutkan.
                </p>
              </div>

              <div className="card">
                <SignIn appearance={clerkAppearance} routing="hash" signUpUrl="#/sign-up" />
              </div>

              <p className="flex items-center gap-1.5 text-[11px] text-text-muted mt-6 justify-center">
                <ShieldCheck size={13} /> Autentikasi aman oleh Clerk
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
