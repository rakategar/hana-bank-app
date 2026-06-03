import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/react';
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { DemoTimeProvider } from './contexts/DemoTimeContext.jsx';
import { IS_DEMO, CLERK_PUBLISHABLE_KEY, CLERK_KEY_MISSING } from './lib/appMode';
import './index.css';

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
    <BrowserRouter>
      <Providers>
        <App />
      </Providers>
    </BrowserRouter>
  </React.StrictMode>
);
