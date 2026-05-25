import { BarChart3, Bell, Building2, CalendarDays, ClipboardList, History, LayoutDashboard, LogOut, Menu, Search, ShieldCheck, UsersRound, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import Logo from '../components/common/Logo';
import NotificationCenter from '../components/common/NotificationCenter';
import { logout } from '../services/authService';

const adminNav = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/couriers', label: 'Kuryeler', icon: UsersRound },
  { to: '/admin/restaurants', label: 'Restoranlar', icon: Building2 },
  { to: '/admin/assignments', label: 'Atamalar', icon: ClipboardList },
  { to: '/admin/reports', label: 'Raporlar', icon: BarChart3 },
  { to: '/admin/daily-report', label: 'Gün Sonu', icon: CalendarDays },
  { to: '/admin/announcements', label: 'Duyurular', icon: Bell },
  { to: '/admin/admins', label: 'Adminler', icon: ShieldCheck },
  { to: '/admin/audit-logs', label: 'İşlem Geçmişi', icon: History },
];

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

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
          {adminNav.map((item) => {
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

        <div className="mt-auto rounded-[1.4rem] border border-white/10 bg-white/[0.055] p-4">
          <p className="eyebrow">Admin oturumu</p>
          <strong className="mt-2 block text-base text-white">Operasyon Yöneticisi</strong>
          <p className="mt-1 text-sm text-dexa-muted">Yetkili yönetim paneli</p>
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
                <p className="hidden text-xs font-black uppercase tracking-[0.24em] text-dexa-muted sm:block">Dexa yönetim merkezi</p>
                <h2 className="truncate text-base font-black text-white sm:text-lg">Restoran, vardiya ve kazanç operasyonu</h2>
              </div>
            </div>

            <div className="hidden min-w-[280px] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-2 lg:flex">
              <Search size={16} className="text-dexa-muted" />
              <span className="text-sm text-dexa-muted">Kurye, restoran veya rapor ara</span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <NotificationCenter mode="admin" />
              <span className="hidden rounded-full border border-dexa-cyan/30 bg-dexa-cyan/10 px-3 py-2 text-xs font-black text-dexa-cyan sm:inline-flex">
                Canlı operasyon
              </span>
            </div>
          </div>
        </header>

        <div className="content-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
