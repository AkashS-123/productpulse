import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, errMsg, logActivity } from '../api/client';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, QueryBoundary, Textarea } from '../components/ui';
import ThemeToggle from '../components/ThemeToggle';
import { useToast } from '../components/Toast';
import { ROLE_LABEL } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import type { Category, Member, Workspace, WorkspaceSubscription } from '../types';
import { slugify } from '../utils';

export default function WorkspaceSelector() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({});
  const [busy, setBusy] = useState(false);

  const q = useFetch(async () => {
    const members = await api.list<Member>('workspaceMembers', { userId: user!.id });
    const all = await api.list<Workspace>('workspaces');
    return members
      .filter((m) => m.status !== 'suspended')
      .map((m) => ({ member: m, workspace: all.find((w) => w.id === m.workspaceId) }))
      .filter((x): x is { member: Member; workspace: Workspace } => !!x.workspace);
  }, [user?.id]);

  async function create(e: FormEvent) {
    e.preventDefault();
    const er: typeof errors = {};
    if (form.name.trim().length < 3) er.name = 'Name must be at least 3 characters.';
    if (form.description.trim().length < 10) er.description = 'Add a short description (10+ characters).';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      let slug = slugify(form.name);
      const taken = await api.list<Workspace>('workspaces', { slug });
      if (taken.length) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
      const ws = await api.create<Workspace>('workspaces', {
        name: form.name.trim(), slug, description: form.description.trim(), logoUrl: '', brandColor: '#0f766e',
        publicRoadmap: true, ownerId: user!.id, createdAt: new Date().toISOString(),
      });
      await Promise.all([
        api.create<Member>('workspaceMembers', { workspaceId: ws.id, userId: user!.id, role: 'owner', status: 'active' }),
        api.create<WorkspaceSubscription>('workspaceSubscriptions', { workspaceId: ws.id, planId: 'free', updatedAt: new Date().toISOString() }),
        api.create<Category>('categories', { workspaceId: ws.id, name: 'General', color: '#64748b' }),
      ]);
      logActivity(ws.id, user!.id, 'created the workspace');
      toast('Workspace created');
      nav(`/w/${ws.id}`);
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8">
      <PageHeader title="Your workspaces" subtitle={`Signed in as ${user?.name}`}
        actions={<><Button onClick={() => setCreating(true)}>New workspace</Button><Button variant="secondary" onClick={logout}>Log out</Button><ThemeToggle /></>} />
      <QueryBoundary q={q}>
        {(rows) => rows.length === 0 ? (
          <EmptyState title="No workspaces yet" message="Create a workspace to start collecting feedback." action={<Button onClick={() => setCreating(true)}>Create workspace</Button>} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {rows.map(({ workspace: w, member }) => (
              <Link key={w.id} to={`/w/${w.id}`} className="block">
                <Card className="hover-lift h-full">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg font-bold text-white" style={{ background: w.brandColor }}>{w.name[0]}</div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{w.name}</p>
                      <Badge tone="blue">{ROLE_LABEL[member.role]}</Badge>
                    </div>
                  </div>
                  <p className="line-clamp-2 text-sm text-slate-500">{w.description}</p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </QueryBoundary>
      <Modal open={creating} title="Create workspace" onClose={() => setCreating(false)}>
        <form onSubmit={create} className="space-y-4" noValidate>
          <Field label="Workspace name" error={errors.name}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Description" error={errors.description}><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <p className="text-xs text-slate-500">New workspaces start on the Free plan. You can change branding and the roadmap settings afterwards.</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create workspace'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
