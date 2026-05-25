import { Bell, Clock3, Home, LogOut, Menu, Wallet, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import Logo from '../components/common/Logo';
import NotificationCenter from '../components/common/NotificationCenter';
import { getSession, logout } from '../services/authService';
import { useOperations } from '../state/OperationsContext';

const courierNav = [
  { to: '/courier/dashboard', label: 'Özet', icon: Home },
  { to: '/courier/shift', label: 'Vardiya', icon: Clock3 },
  { to: '/courier/earnings', label: 'Kazanç', icon: Wallet },
  { to: '/courier/announcements', label: 'Duyurular', icon: Bell },
];

export default function CourierLayout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const session = getSession();
  const { ensureShiftWarningNotifications } = useOperations();

  useEffect(() => {
    if (!session?.courierId) return;
    ensureShiftWarningNotifications(session.courierId);
    const timer = window.setInterval(() => ensureShiftWarningNotifications(session.courierId), 60000);
    return () => window.clearInterval(timer);
  }, [ensureShiftWarningNotifications, session?.courierId]);

  const signOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-background">
      {open && <button className="mobile-scrim" type="button" aria-label="Menüyü kapat" onClick={() => setOpen(false)} />}

      <aside className={`app-sidebar ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex items-center justify-between gap-3">
          <Logo />
          <button className="icon-button md:hidden" type="button" onClick={() => setOpen(false)} aria-label="Menüyü kapat">
            <X size={18} />
          </button>
        </div>

        <nav className="mt-9 grid gap-2">
          {courierNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto rounded-[1.4rem] border border-dexa-cyan/20 bg-dexa-cyan/10 p-4">
          <p className="eyebrow">Kurye oturumu</p>
          <strong className="mt-2 block text-base text-white">{session?.name}</strong>
          <p className="mt-1 text-sm text-dexa-muted">Mobil vardiya paneli</p>
          <button className="secondary-button mt-4 w-full" type="button" onClick={signOut}>
            <LogOut size={16} />
            Çıkış
          </button>
        </div>
      </aside>

      <main className="app-main">
        <header className="app-topbar">
          <div className="topbar-inner">
            <div className="flex min-w-0 items-center gap-3">
              <button className="icon-button md:hidden" type="button" onClick={() => setOpen(true)} aria-label="Menüyü aç">
                <Menu size={18} />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-dexa-muted">Dexa kurye paneli</p>
                <h2 className="truncate text-base font-black text-white sm:text-lg">{session?.name}</h2>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <NotificationCenter mode="courier" />
              <span className="hidden rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs font-black text-emerald-100 sm:inline-flex">
                Vardiya aktif
              </span>
            </div>
          </div>
        </header>

        <div className="content-container courier-content max-w-[1180px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
