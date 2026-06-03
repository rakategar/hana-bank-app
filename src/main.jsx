import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/react';
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { DemoTimeProvider } from './contexts/DemoTimeContext.jsx';
import { IS_DEMO } from './lib/appMode';
import './index.css';

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
  return (
    <ClerkProvider afterSignOutUrl="/">
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
