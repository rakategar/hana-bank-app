import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { getRHSession } from './lib/rhSession';
import { initializeRHCredentials } from './lib/db';

import Login from './pages/Login';
import RHLogin from './pages/RHLogin';
import Onboarding from './pages/Onboarding';
import FADashboard from './pages/fa/Dashboard';
import FWSSDashboard from './pages/fwss/Dashboard';
import BMDashboard from './pages/bm/Dashboard';
import RHDashboard from './pages/rh/Dashboard';
import WeeklyPlan from './pages/WeeklyPlan';
import DailyInput from './pages/DailyInput';
import ScoreResult from './pages/ScoreResult';
import FWSSSummary from './pages/fwss/Summary';
import NotesArchive from './pages/fwss/NotesArchive';
import BMSummary from './pages/bm/Summary';
import RHSummary from './pages/rh/Summary';

function Loader() {
  return (
    <div className="min-h-screen grid place-items-center bg-charcoal">
      <div className="h-10 w-10 rounded-full border-2 border-hana-teal-500 border-t-transparent animate-spin" />
    </div>
  );
}

function ProtectedRoute({ role, children }) {
  const { user, ready, isSignedIn, needsOnboarding, dashboardPath } = useAuth();
  const location = useLocation();

  if (!ready) return <Loader />;
  if (!isSignedIn) return <Navigate to="/" replace state={{ from: location }} />;
  if (needsOnboarding) return <Navigate to="/onboarding" replace />;
  if (role && user.role !== role) return <Navigate to={dashboardPath()} replace />;
  return children;
}

function RHProtectedRoute({ children }) {
  const location = useLocation();
  const session = getRHSession();

  if (!session) return <Navigate to="/rh" replace state={{ from: location }} />;

  return children;
}

export default function App() {
  const { user, ready, isSignedIn, needsOnboarding, dashboardPath } = useAuth();

  // App berhasil mount → reset penanda guard reload chunk (lihat main.jsx),
  // agar error chunk di kemudian hari masih bisa dipulihkan sekali lagi.
  useEffect(() => {
    sessionStorage.removeItem('icu_chunk_reloaded');
  }, []);

  // Initialize RH credentials di startup (silent, untuk MVP)
  useEffect(() => {
    initializeRHCredentials().catch(() => {
      // Silent error - credentials mungkin sudah ada atau user belum setup
    });
  }, []);

  if (!ready) return <Loader />;

  return (
    <Routes>
      <Route path="/rh" element={<RHLogin />} />

      <Route
        path="/"
        element={
          isSignedIn
            ? needsOnboarding
              ? <Navigate to="/onboarding" replace />
              : <Navigate to={dashboardPath()} replace />
            : <Login />
        }
      />

      <Route
        path="/onboarding"
        element={
          !isSignedIn
            ? <Navigate to="/" replace />
            : user
              ? <Navigate to={dashboardPath()} replace />
              : <Onboarding />
        }
      />

      <Route path="/dashboard/fa" element={<ProtectedRoute role="FA"><FADashboard /></ProtectedRoute>} />
      <Route path="/dashboard/fwss" element={<ProtectedRoute role="FWSS"><FWSSDashboard /></ProtectedRoute>} />
      <Route path="/dashboard/bm" element={<ProtectedRoute role="BM"><BMDashboard /></ProtectedRoute>} />
      <Route path="/dashboard/rh" element={<RHProtectedRoute><RHDashboard /></RHProtectedRoute>} />

      <Route path="/weekly-plan" element={<ProtectedRoute><WeeklyPlan /></ProtectedRoute>} />
      <Route path="/daily-input" element={<ProtectedRoute><DailyInput /></ProtectedRoute>} />
      <Route path="/score-result" element={<ProtectedRoute><ScoreResult /></ProtectedRoute>} />

      <Route path="/summary/fwss" element={<ProtectedRoute role="FWSS"><FWSSSummary /></ProtectedRoute>} />
      <Route path="/notes-archive" element={<ProtectedRoute role="FWSS"><NotesArchive /></ProtectedRoute>} />
      <Route path="/summary/bm" element={<ProtectedRoute role="BM"><BMSummary /></ProtectedRoute>} />
      <Route path="/summary/rh" element={<RHProtectedRoute><RHSummary /></RHProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
