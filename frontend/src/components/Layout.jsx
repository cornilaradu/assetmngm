import React, { useEffect, useRef, useState } from 'react';
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  Wrench,
  CarFront,
  BatteryCharging,
  Building2,
  LayoutDashboard,
  CalendarDays,
  Package,
  FileUp,
  Settings,
  UserRound,
  LogOut,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const generalItems = [
  { to: '/', label: 'Dashboard general', icon: LayoutDashboard },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/assets', label: 'Asset-uri', icon: Package },
];

const managementItems = [
  { to: '/import-export', label: 'Import / Export', icon: FileUp },
  {
    to: '/admin',
    label: 'Administrare',
    icon: Settings,
    roles: ['ADMIN'],
  },
];

const moduleItems = [
  { code: 'AUTO', to: '/modules/auto', label: 'AUTO', icon: CarFront },
  { code: 'UPS', to: '/modules/ups', label: 'UPS', icon: BatteryCharging },
  { code: 'FACILITIES', to: '/modules/facilities', label: 'FACILITĂȚI', icon: Building2 },
];

const pageTitles = {
  '/': 'Dashboard',
  '/calendar': 'Calendar',
  '/assets': 'Asset-uri',
  '/import-export': 'Import / Export',
  '/admin': 'Administrare',
  '/profile': 'Contul meu',
};

export default function Layout() {
  const { user, logout } = useAuth();

  const visibleModules = moduleItems.filter((item) =>
    user?.role === 'ADMIN' ||
    user?.moduleAccess?.some((access) => access.module?.code === item.code)
  );

  const navigate = useNavigate();
  const location = useLocation();

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const pageTitle =
    pageTitles[location.pathname] ||
    (location.pathname.startsWith('/assets/')
      ? 'Detalii asset'
      : 'Portal Mentenanță');

  const fullName = user?.fullName || 'Utilizator';

  const initials = fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  useEffect(() => {
    if (!profileOpen) return;

    function handleOutsideClick(event) {
      if (!profileRef.current?.contains(event.target)) {
        setProfileOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setProfileOpen(false);
      }
    }

    document.addEventListener('pointerdown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [profileOpen]);

  useEffect(() => {
    setProfileOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    setProfileOpen(false);
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex bg-[#F5F7FB]">
      <aside className="w-64 shrink-0 bg-[#172B4D] text-white flex flex-col min-h-screen">
        <div className="px-5 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Wrench size={22} className="text-blue-200" />
            </div>

            <div className="min-w-0">
              <div className="text-base font-semibold tracking-tight">
                Portal Mentenanță
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                Asset Management
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {[
            { title: 'General', items: generalItems },
            { title: 'Gestionare', items: managementItems },
          ].slice(0, 1).map((section) => (
            <React.Fragment key={section.title}>
              <div className="px-3 mb-3 text-[10px] uppercase tracking-[0.18em] text-slate-400 font-semibold">
                {section.title}
              </div>

              {section.items
                .filter((item) => !item.roles || item.roles.includes(user?.role))
                .map((item) => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-[#285CB0] text-white shadow-sm'
                            : 'text-slate-300 hover:bg-white/10 hover:text-white'
                        }`
                      }
                    >
                      <Icon size={19} strokeWidth={1.8} />
                      <span className="flex-1">{item.label}</span>
                    </NavLink>
                  );
                })}
            </React.Fragment>
          ))}

          {visibleModules.length > 0 && (
          <div className="mt-6 pt-5 border-t border-white/10">
            <div className="px-3 mb-3 text-[10px] uppercase tracking-[0.18em] text-slate-400 font-semibold">
              Module mentenanță
            </div>

            {visibleModules.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.code}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#285CB0] text-white shadow-sm'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Icon size={19} strokeWidth={1.8} />
                  <span className="flex-1">{item.label}</span>

                </NavLink>
              );
            })}
          </div>
          )}

          <div className="mt-6 pt-5 border-t border-white/10">
            <div className="px-3 mb-3 text-[10px] uppercase tracking-[0.18em] text-slate-400 font-semibold">
              Gestionare
            </div>

            {managementItems
              .filter((item) => !item.roles || item.roles.includes(user?.role))
              .map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-[#285CB0] text-white shadow-sm'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`
                    }
                  >
                    <Icon size={19} strokeWidth={1.8} />
                    <span className="flex-1">{item.label}</span>
                  </NavLink>
                );
              })}
          </div>
        </nav>

        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-xs text-slate-400">
            Asset Maintenance Portal
          </p>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="relative z-30 h-[76px] shrink-0 bg-white border-b border-slate-200 px-8 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 mb-1">
              Portal Mentenanță
            </div>
            <div className="text-lg font-semibold text-slate-800">
              {pageTitle}
            </div>
          </div>

          <div className="flex items-center gap-5">
            <NotificationBell />

            <div className="h-8 w-px bg-slate-200" />

            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((value) => !value)}
                aria-label="Meniu utilizator"
                aria-expanded={profileOpen}
                aria-haspopup="true"
                className={`flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-slate-50 ${
                  profileOpen ? 'bg-blue-50' : ''
                }`}
              >
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-semibold text-slate-800">
                    {fullName}
                  </div>
                  <div className="text-xs text-slate-400">
                    {user?.role}
                  </div>
                </div>

                <div className="w-9 h-9 shrink-0 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                  {initials || <UserRound size={18} />}
                </div>

                <ChevronDown
                  size={16}
                  className={`text-slate-500 transition-transform ${
                    profileOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-3 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl z-50">
                  <div className="border-b border-slate-100 px-4 py-4">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {fullName}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {user?.role || 'USER'}
                    </div>
                  </div>

                  <div className="p-2">
                    <NavLink
                      to="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-700 transition hover:bg-slate-100"
                    >
                      <UserRound size={18} />
                      Contul meu
                    </NavLink>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-red-600 transition hover:bg-red-50"
                    >
                      <LogOut size={18} />
                      Delogare
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
