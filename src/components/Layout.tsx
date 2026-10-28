import { CSSProperties, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ROLE_LABEL } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import type { Role } from '../types';
import ThemeToggle from './ThemeToggle';
import { Badge, Button, cx } from './ui';

const ALL: Role[] = ['owner', 'admin', 'pm', 'customer'];
const NAV: { to: string; label: string; roles: Role[] }[] = [
  { to: '', label: 'Dashboard', roles: ['owner', 'admin', 'pm'] },
  { to: 'feedback', label: 'Feedback', roles: ALL },
  { to: 'roadmap', label: 'Roadmap board', roles: ALL },
  { to: 'releases', label: 'Release notes', roles: ALL },
  { to: 'categories', label: 'Categories & tags', roles: ['owner', 'admin'] },
  { to: 'team', label: 'Team & roles', roles: ['owner', 'admin'] },
  { to: 'subscription', label: 'Subscription & usage', roles: ['owner'] },
  { to: 'settings', label: 'Workspace settings', roles: ['owner'] },
];

export default function Layout() {
  const { workspace, role } = useWorkspace();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const base = `/w/${workspace.id}`;

  return (
    <div className="min-h-screen" style={{ '--brand': workspace.brandColor } as CSSProperties}>
      <aside className={cx('fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-surface transition-transform md:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-4">
          {workspace.logoUrl
            ? <img src={workspace.logoUrl} alt="" className="h-9 w-9 rounded-lg object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            : <div className="flex h-9 w-9 items-center justify-center rounded-xl brand-gradient font-bold text-white shadow-sm">{workspace.name[0]}</div>}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{workspace.name}</p>
            <Link to="/workspaces" className="text-xs text-slate-500 underline">Switch workspace</Link>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Main">
          {NAV.filter((i) => i.roles.includes(role)).map((i) => (
            <NavLink key={i.label} to={i.to ? `${base}/${i.to}` : base} end={!i.to} onClick={() => setOpen(false)}
              className={({ isActive }) => cx('block rounded-xl px-3 py-2 text-sm font-medium transition', isActive ? 'bg-brand-soft text-brand shadow-[inset_3px_0_0_var(--brand)]' : 'text-slate-600 hover:bg-slate-100')}>
              {i.label}
            </NavLink>
          ))}
          <a href={`/roadmap/${workspace.slug}`} target="_blank" rel="noreferrer" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Public roadmap ↗
          </a>
        </nav>
        <div className="border-t border-slate-200 p-4 text-sm">
          <p className="truncate font-medium">{user?.name}</p>
          <div className="mb-3 mt-1"><Badge tone="blue">{ROLE_LABEL[role]}</Badge></div>
          <div className="flex gap-2"><Button variant="secondary" className="flex-1" onClick={() => { logout(); nav('/login'); }}>Log out</Button><ThemeToggle /></div>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setOpen(false)} />}
      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-surface/80 px-4 py-3 backdrop-blur md:hidden">
          <button aria-label="Open menu" onClick={() => setOpen(true)} className="rounded p-1 text-xl">☰</button>
          <span className="flex-1 font-semibold">{workspace.name}</span><ThemeToggle />
        </header>
        <main className="mx-auto max-w-6xl p-4 md:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
