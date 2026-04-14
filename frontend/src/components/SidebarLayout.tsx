import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings } from 'lucide-react';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/configuracoes', label: 'Configurações', icon: Settings }
];

export function SidebarLayout() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-64 border-r border-slate-200 bg-white p-4">
        <h1 className="mb-6 text-lg font-semibold text-slate-800">td-monitor</h1>
        <nav className="space-y-2">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                location.pathname === to ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
