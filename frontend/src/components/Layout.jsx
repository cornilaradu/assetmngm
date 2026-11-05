
import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/assets', label: 'Asset-uri' },
  { to: '/import-export', label: 'Import / Export' },
  { to: '/admin', label: 'Administrare', roles: ['ADMIN'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-brand-700 text-white flex flex-col">
        <div className="p-5 text-lg font-semibold border-b border-brand-600">
          Portal Mentenanta
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems
            .filter((item) => !item.roles || item.roles.includes(user?.role))
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-white text-brand-700'
                      : 'text-blue-100 hover:bg-brand-600'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
        </nav>

        <div className="p-4 border-t border-brand-600 text-sm">
          <div className="font-medium">{user?.fullName}</div>
          <div className="text-blue-200 text-xs mb-2">{user?.role}</div>

          <div className="flex gap-3">
            <NavLink
              to="/profile"
              className="text-blue-100 hover:text-white underline text-xs"
            >
              Contul meu
            </NavLink>

            <button
              onClick={handleLogout}
              className="text-blue-100 hover:text-white underline text-xs"
            >
              Delogare
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
