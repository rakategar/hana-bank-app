import { ShieldCheck } from 'lucide-react';
import { SignIn } from '@clerk/react';
import { IS_DEMO } from '../lib/appMode';
import DemoLogin from './DemoLogin';

const logo = '/hana-bank-logo.png';

const clerkAppearance = {
  variables: {
    colorPrimary: '#04B292',
    colorText: '#1F2933',
    colorBackground: '#FFFFFF',
    borderRadius: '0.5rem',
    fontFamily: '"Plus Jakarta Sans", sans-serif',
  },
  elements: {
    rootBox: 'w-full',
    card: 'shadow-none border-0 bg-transparent p-0',
    headerTitle: 'font-display',
    socialButtonsBlockButton: 'border-hana-border hover:bg-elevated text-ink font-medium',
    footer: 'hidden',
  },
};

function BrandHeader() {
  return (
    <div className="flex items-center gap-3">
      <img src={logo} alt="Bank Hana" className="h-10 w-10" />
      <div className="leading-tight">
        <p className="font-display text-xl font-bold text-ink">ICU Class</p>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-hana-teal-700">Bank Hana</p>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-charcoal">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(4,178,146,0.12)_0%,transparent_30%,rgba(230,37,96,0.08)_100%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.28]"
        style={{
          backgroundImage:
            'linear-gradient(#dbe5f1 1px, transparent 1px), linear-gradient(90deg, #dbe5f1 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      <main className="relative mx-auto grid min-h-[calc(100vh-3.25rem)] max-w-6xl items-center gap-10 px-5 py-8 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="hidden lg:block">
          <div className="mb-4 flex items-center gap-3">
            <img src={logo} alt="Bank Hana" className="h-6 w-6" />
            <p className="text-xs font-bold uppercase tracking-[0.22em]">
              <span className="text-ink">ICU Class</span>{' '}
              <span className="text-hana-teal-700">Bank Hana</span>
            </p>
          </div>
          <h1 className="max-w-xl font-display text-5xl font-extrabold leading-[1.04] text-ink">
            Kontrol eksekusi sales harian dalam satu sistem kerja.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-text-secondary">
            Rencana mingguan, input aktivitas, scoring AI, monitoring atasan, dan tindak lanjut performa dibuat terstruktur untuk FA, FWSS, BM, dan RH.
          </p>

          <div className="mt-8 grid max-w-xl grid-cols-2 gap-3">
            {[
              ['Weekly Plan', 'Aktivitas tersusun per hari kerja'],
              ['Daily Input', 'Realisasi dicatat per slot waktu'],
              ['AI Scoring', 'Evaluasi objektif berbasis rubrik'],
              ['Supervisor Notes', 'Arahan dan action plan berjenjang'],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-2xl border border-white/80 bg-white/75 p-4 shadow-card backdrop-blur-xl">
                <p className="text-sm font-bold text-ink">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-text-muted">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="w-full">
          <div className="mb-6 flex justify-center lg:hidden">
            <BrandHeader />
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-elevated backdrop-blur-2xl sm:p-7">
            {IS_DEMO ? (
              <DemoLogin />
            ) : (
              <>
                <div className="mb-5">
                  <h2 className="font-display text-3xl font-bold leading-none text-ink">Masuk</h2>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    Gunakan akun Google yang terdaftar untuk mengakses dashboard ICU Class.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/80 bg-white/70 p-3 shadow-card">
                  <SignIn appearance={clerkAppearance} routing="hash" signUpUrl="#/sign-up" />
                </div>

                <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] font-medium text-text-muted">
                  <ShieldCheck size={13} /> Autentikasi aman oleh Clerk
                </p>
              </>
            )}
          </div>
        </section>
      </main>

      <footer className="relative pb-5 text-center text-[11px] text-text-muted">
        Bank Hana internal system - v4.0
      </footer>
    </div>
  );
}
