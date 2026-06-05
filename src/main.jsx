import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/react';
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { DemoTimeProvider } from './contexts/DemoTimeContext.jsx';
import { IS_DEMO, CLERK_PUBLISHABLE_KEY, CLERK_KEY_MISSING } from './lib/appMode';
import './index.css';

// Pemulihan blank page tanpa memaksa reload tiap kali tombol "kembali" ditekan.
// Penyebab umum blank page = chunk JS basi setelah deploy baru (dynamic import gagal).
// Vite memancarkan 'vite:preloadError' → muat ulang SEKALI (dijaga agar tidak loop).
window.addEventListener('vite:preloadError', () => {
  if (!sessionStorage.getItem('icu_chunk_reloaded')) {
    sessionStorage.setItem('icu_chunk_reloaded', '1');
    window.location.reload();
  }
});

// Error boundary — mencegah layar kosong ketika ada render error di sub-tree.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen grid place-items-center bg-charcoal p-6">
          <div className="card max-w-lg text-center space-y-4">
            <p className="font-display text-xl font-bold text-score-1">Terjadi Kesalahan</p>
            <p className="text-sm text-text-secondary">{String(this.state.error.message || this.state.error)}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-teal mx-auto"
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Saat mode live tapi VITE_CLERK_PUBLISHABLE_KEY belum diset, ClerkProvider akan
// gagal init (loading menggantung). Tampilkan pesan setup yang jelas, bukan spinner.
function ClerkKeyMissing() {
  return (
    <div className="min-h-screen grid place-items-center bg-charcoal p-6">
      <div className="card max-w-lg text-center space-y-3">
        <p className="font-display text-xl font-bold text-score-1">Konfigurasi belum lengkap</p>
        <p className="text-sm text-text-secondary">
          Mode <b>live</b> membutuhkan Clerk untuk login Google, tetapi
          <code className="mx-1 px-1.5 py-0.5 rounded bg-elevated text-ink">VITE_CLERK_PUBLISHABLE_KEY</code>
          belum diset di Environment Variables Vercel.
        </p>
        <p className="text-xs text-text-muted">
          Tambahkan key dari dashboard.clerk.com (Publishable Key) di Vercel → Project Settings →
          Environment Variables, lalu redeploy. Atau set <code>VITE_APP_MODE=demo</code> untuk mode demo
          tanpa Clerk.
        </p>
      </div>
    </div>
  );
}

// Demo: DemoTimeProvider (kontrol waktu) + tanpa Clerk.
// Live: ClerkProvider (login Google) + tanpa demo clock.
function Providers({ children }) {
  if (IS_DEMO) {
    return (
      <DemoTimeProvider>
        <AuthProvider>{children}</AuthProvider>
      </DemoTimeProvider>
    );
  }
  if (CLERK_KEY_MISSING) {
    return <ClerkKeyMissing />;
  }
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
      <AuthProvider>{children}</AuthProvider>
    </ClerkProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Providers>
          <App />
        </Providers>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
