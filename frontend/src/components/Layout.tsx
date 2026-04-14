import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Clock,
  Database,
  LayoutDashboard,
  Menu,
  PanelTop,
  RefreshCw,
  ScrollText,
  X
} from 'lucide-react';
import { apiService } from '../services/api';

type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ size?: string | number }>;
};

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/connections', label: 'Configurações · Conexões', icon: Database },
  { to: '/panels', label: 'Configurações · Painéis', icon: PanelTop },
  { to: '/schedules', label: 'Configurações · Agendamentos', icon: Clock },
  { to: '/logs', label: 'Logs de Execução', icon: ScrollText }
];

export function Layout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [lastUpdated, setLastUpdated] = useState<string | null>(localStorage.getItem('dashboard_last_updated'));

  const connectionsQuery = useQuery({ queryKey: ['connections'], queryFn: apiService.getConnections, refetchInterval: 30000 });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    const updateListener = () => setLastUpdated(localStorage.getItem('dashboard_last_updated'));
    window.addEventListener('dashboard-updated', updateListener);

    return () => {
      clearInterval(timer);
      window.removeEventListener('dashboard-updated', updateListener);
    };
  }, []);

  const breadcrumb = useMemo(() => {
    const entry = navItems.find((item) => item.to === location.pathname);
    return entry?.label ?? 'Dashboard';
  }, [location.pathname]);

  const sidebarWidth = collapsed ? 'w-16' : 'w-60';
  const activeConnections = (connectionsQuery.data ?? []).filter((c) => c.isActive).length;
  const nextRefresh = new Date(Date.now() + 30000);

  const sidebar = (
    <aside className={`fixed left-0 top-0 z-40 h-screen border-r border-white/10 bg-[#0f1520] ${sidebarWidth} transition-all`}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#34d399]" />
            {!collapsed && <span className="text-sm font-semibold tracking-wide text-white">TD::MONITOR</span>}
          </div>
          <button className="text-slate-400 hover:text-white" onClick={() => setCollapsed((v) => !v)}>
            {collapsed ? <Menu size={18} /> : <X size={18} />}
          </button>
        </div>

        {!collapsed && (
          <div className="px-4 pt-4">
            <span className="rounded-full border border-[#2dd4bf]/40 bg-[#2dd4bf]/10 px-2 py-1 text-xs text-[#2dd4bf]">
              {import.meta.env.VITE_ENV_NAME ?? 'PRODUÇÃO'}
            </span>
          </div>
        )}

        <nav className="mt-4 flex-1 space-y-1 px-2">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                  active
                    ? 'border border-[#2dd4bf]/40 bg-[#2dd4bf]/15 text-[#2dd4bf]'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3 text-xs text-slate-400">
          {!collapsed && <p>Última atualização: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : '—'}</p>}
          <button
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-[#2dd4bf]/40 bg-[#2dd4bf]/10 px-3 py-2 text-xs text-[#2dd4bf] hover:bg-[#2dd4bf]/20"
            onClick={() => window.dispatchEvent(new Event('refresh-now'))}
          >
            <RefreshCw size={14} />
            {!collapsed && 'Atualizar Agora'}
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[var(--bg-0)] text-slate-100">
      <div className="md:hidden p-3">
        <button onClick={() => setMobileOpen(true)} className="rounded-lg border border-white/10 p-2 text-slate-200">
          <Menu size={18} />
        </button>
      </div>

      <div className="hidden md:block">{sidebar}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 md:hidden">
          <div className="h-full w-64">{sidebar}</div>
        </div>
      )}

      <main className={`transition-all ${collapsed ? 'md:ml-16' : 'md:ml-60'}`}>
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0e14]/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <h1 className="text-sm text-slate-300">{breadcrumb}</h1>
            <span className="font-mono text-xs text-slate-400">{now.toLocaleString()}</span>
          </div>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
        <footer className="border-t border-white/10 px-6 py-3 text-xs text-slate-400">
          <div className="flex flex-wrap gap-4">
            <span>v1.0.0</span>
            <span>Ambiente: {import.meta.env.VITE_ENV_NAME ?? 'PRODUÇÃO'}</span>
            <span>Conexões ativas: {activeConnections}</span>
            <span>Último refresh: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : '—'}</span>
            <span>Próximo refresh: {nextRefresh.toLocaleTimeString()}</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
