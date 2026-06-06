import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LogOut, ChevronLeft, Bell, Menu, X,
  LayoutDashboard, ClipboardList, PencilLine, Bot, FolderClock,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { initials, ROLE_LABELS, clsx } from '../lib/utils';
import logo from '/hana-bank-logo.png';

function navForRole(role) {
  const dash = { to: `/dashboard/${role.toLowerCase()}`, label: 'Dashboard', icon: LayoutDashboard };
  if (role === 'RH') {
    return [dash, { to: '/summary/rh', label: 'Summary Regional', icon: Bot }];
  }
  const items = [
    dash,
    { to: '/weekly-plan', label: 'Rencana Mingguan', icon: ClipboardList },
    { to: '/daily-input', label: 'Input Aktivitas', icon: PencilLine },
  ];
  if (role === 'FWSS') {
    items.push({ to: '/summary/fwss', label: 'Summary FA', icon: Bot });
    items.push({ to: '/notes-archive', label: 'Arsip Catatan', icon: FolderClock });
  }
  if (role === 'BM') items.push({ to: '/summary/bm', label: 'Summary Tim', icon: Bot });
  return items;
}

function Sidebar({ user, items, current, onNavigate, onLogout }) {
  return (
    <div className="flex flex-col h-full bg-sidebar text-white">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/10">
        <img src={logo} alt="Bank Hana" className="h-8 w-8 bg-white rounded-lg p-1" />
        <div className="leading-tight">
          <p className="font-display text-lg font-bold">ICU Class</p>
          <p className="text-[10px] text-white/60 -mt-1">Bank Hana</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map(({ to, label, icon: Icon }) => (
          <button
            key={to}
            onClick={() => onNavigate(to)}
            className={clsx('nav-item w-full', current === to && 'nav-item-active')}
          >
            <Icon size={18} /> {label}
          </button>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="h-9 w-9 rounded-full bg-hana-teal-500 grid place-items-center font-display font-bold text-white text-sm shrink-0">
            {initials(user.name)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{user.name}</p>
            <p className="text-[10px] text-white/60 truncate">{ROLE_LABELS[user.role]}</p>
          </div>
        </div>
        <button onClick={onLogout} className="nav-item w-full text-white/70">
          <LogOut size={18} /> Keluar
        </button>
      </div>
    </div>
  );
}

export default function Layout({ children, title, back, unreadCount = 0 }) {
  const { user, logout, dashboardPath } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);

  const items = navForRole(user.role);

  function go(to) {
    setDrawer(false);
    navigate(to);
  }
  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-screen bg-charcoal lg:flex">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:block w-64 shrink-0 fixed inset-y-0 left-0 z-30">
        <Sidebar user={user} items={items} current={location.pathname} onNavigate={go} onLogout={handleLogout} />
      </aside>

      {/* Drawer — mobile */}
      {drawer && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-64 animate-slide-down">
            <Sidebar user={user} items={items} current={location.pathname} onNavigate={go} onLogout={handleLogout} />
          </div>
        </div>
      )}

      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-hana-border">
          <div className="h-16 px-4 sm:px-6 flex items-center gap-3">
            <button onClick={() => setDrawer(true)} className="lg:hidden text-text-secondary hover:text-ink" aria-label="Menu">
              <Menu size={22} />
            </button>

            {back && (
              <button
                onClick={() => navigate(back === true ? dashboardPath() : back)}
                className="hidden sm:inline-flex items-center gap-1 text-sm text-text-secondary hover:text-ink"
              >
                <ChevronLeft size={18} /> Kembali
              </button>
            )}

            <h1 className="font-display text-xl font-bold truncate flex-1">
              {title || 'Dashboard'}
            </h1>

            {unreadCount > 0 && (
              <div className="relative">
                <Bell size={20} className="text-score-1" />
                <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-score-1 text-white text-[10px] font-bold grid place-items-center">
                  {unreadCount}
                </span>
              </div>
            )}

            <div className="lg:hidden h-9 w-9 rounded-full bg-hana-teal-500 grid place-items-center font-display font-bold text-white text-sm">
              {initials(user.name)}
            </div>
          </div>
        </header>

        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
