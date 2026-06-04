import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LogOut, ChevronLeft, Bell, Menu,
  LayoutDashboard, ClipboardList, PencilLine, Bot, FolderClock,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { initials, ROLE_LABELS, clsx } from '../lib/utils';
import { IS_DEMO } from '../lib/appMode';
import DemoClock from './DemoClock';
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
    <div className="flex h-full flex-col border-r border-white/10 bg-sidebar text-white shadow-elevated">
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <img src={logo} alt="Bank Hana" className="h-9 w-9" />
        <div className="leading-tight">
          <p className="font-display text-lg font-extrabold">ICU Class</p>
          <p className="-mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-hana-teal-100">Bank Hana</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
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

      <div className="border-t border-white/10 p-3">
        <div className="mb-3 rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-hana-teal-500 font-display text-sm font-bold text-white">
              {initials(user.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-[10px] text-white/60">{ROLE_LABELS[user.role]}</p>
            </div>
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
          <div className="absolute inset-0 bg-ink/45 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-64 animate-slide-down shadow-elevated">
            <Sidebar user={user} items={items} current={location.pathname} onNavigate={go} onLogout={handleLogout} />
          </div>
        </div>
      )}

      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-20 border-b border-white/60 bg-white/70 shadow-[0_1px_24px_rgba(15,23,42,0.05)] backdrop-blur-2xl">
          <div className="h-16 px-4 sm:px-6 flex items-center gap-3">
            <button
              onClick={() => setDrawer(true)}
              className="grid h-10 w-10 place-items-center rounded-xl text-text-secondary transition-colors hover:bg-white hover:text-ink lg:hidden"
              aria-label="Menu"
            >
              <Menu size={22} />
            </button>

            {back && (
              <button
                onClick={() => navigate(back === true ? dashboardPath() : back)}
                className="hidden items-center gap-1 rounded-xl px-2.5 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-white hover:text-ink sm:inline-flex"
              >
                <ChevronLeft size={18} /> Kembali
              </button>
            )}

            <h1 className="font-display text-xl font-extrabold truncate flex-1">
              {title || 'Dashboard'}
            </h1>

            {IS_DEMO && <DemoClock />}

            {unreadCount > 0 && (
              <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-white/70 shadow-card">
                <Bell size={20} className="text-score-1" />
                <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-score-1 text-white text-[10px] font-bold grid place-items-center">
                  {unreadCount}
                </span>
              </div>
            )}

            <div className="grid h-9 w-9 place-items-center rounded-xl bg-hana-teal-500 font-display text-sm font-bold text-white shadow-card lg:hidden">
              {initials(user.name)}
            </div>
          </div>
        </header>

        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
