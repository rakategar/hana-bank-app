import { useNavigate } from 'react-router-dom';
import { LogOut, ChevronLeft, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { initials, ROLE_LABELS, clsx } from '../lib/utils';
import logo from '/hana-bank-logo.png';

export default function Layout({ children, title, back, unreadCount = 0, accent = 'teal' }) {
  const { user, logout, dashboardPath } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  const headerBg = accent === 'rh' ? 'bg-hana-teal-700/20 border-hana-teal-700' : 'bg-card border-hana-border';

  return (
    <div className="min-h-screen bg-charcoal flex flex-col">
      <header className={clsx('sticky top-0 z-40 border-b backdrop-blur-md', headerBg)}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          {back ? (
            <button onClick={() => navigate(back === true ? dashboardPath() : back)} className="text-text-secondary hover:text-white shrink-0" aria-label="Kembali">
              <ChevronLeft size={22} />
            </button>
          ) : (
            <img src={logo} alt="Bank Hana" className="h-8 w-8 shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            {title ? (
              <h1 className="font-display text-lg font-bold leading-tight truncate">{title}</h1>
            ) : (
              <div className="leading-tight">
                <p className="font-display text-base font-bold">ICU Class</p>
                <p className="text-[10px] text-text-muted -mt-0.5">Bank Hana</p>
              </div>
            )}
          </div>

          {unreadCount > 0 && (
            <div className="relative shrink-0">
              <Bell size={20} className="text-score-1" />
              <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-score-1 text-white text-[10px] font-bold grid place-items-center">
                {unreadCount}
              </span>
            </div>
          )}

          {user && (
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:block text-right leading-tight">
                <p className="text-xs font-semibold truncate max-w-[120px]">{user.name}</p>
                <p className="text-[10px] text-text-muted">{ROLE_LABELS[user.role]}</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-hana-teal-500 grid place-items-center font-display font-bold text-white text-sm">
                {initials(user.name)}
              </div>
              <button onClick={handleLogout} className="text-text-muted hover:text-score-1 ml-1" aria-label="Logout" title="Logout">
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-5 pb-24">{children}</main>
    </div>
  );
}
