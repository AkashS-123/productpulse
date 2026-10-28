import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, deleteWorkspaceCascade, errMsg, logActivity } from '../api/client';
import { useToast } from '../components/Toast';
import { Button, Card, ConfirmDialog, Field, Input, PageHeader, Textarea } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import type { Workspace } from '../types';
import { isHexColor, isUrl, slugify } from '../utils';

export default function Settings() {
  const { workspace, reload } = useWorkspace();
  const { user } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [f, setF] = useState({ name: workspace.name, description: workspace.description, logoUrl: workspace.logoUrl, brandColor: workspace.brandColor, slug: workspace.slug, publicRoadmap: workspace.publicRoadmap });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [typed, setTyped] = useState('');

  async function save(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (f.name.trim().length < 3) er.name = 'Name must be at least 3 characters.';
    if (f.description.trim().length < 10) er.description = 'Add a short description (10+ characters).';
    if (f.logoUrl && !isUrl(f.logoUrl)) er.logoUrl = 'Enter a full URL starting with http:// or https://.';
    if (!isHexColor(f.brandColor)) er.brandColor = 'Use a hex colour such as #0f766e.';
    const slug = slugify(f.slug);
    if (!slug) er.slug = 'Enter a URL name for the public roadmap.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const clash = (await api.list<Workspace>('workspaces', { slug })).find((w) => w.id !== workspace.id);
      if (clash) { setErrors({ slug: 'This URL name is taken. Try another.' }); return; }
      await api.update<Workspace>('workspaces', workspace.id, { ...f, name: f.name.trim(), description: f.description.trim(), slug });
      logActivity(workspace.id, user!.id, 'updated the workspace settings');
      toast('Settings saved');
      reload();
    } catch (err) { setErrors({ form: errMsg(err) }); } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    try { await deleteWorkspaceCascade(workspace.id); toast('Workspace deleted'); nav('/workspaces'); } catch (e) { toast(errMsg(e), 'error'); setBusy(false); }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Workspace settings" />
      <Card>
        <form onSubmit={save} className="space-y-4" noValidate>
          {errors.form && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</p>}
          <Field label="Workspace name" error={errors.name}><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Description" error={errors.description}><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <Field label="Logo URL" error={errors.logoUrl} hint="Optional. Shown in the sidebar and on the public roadmap."><Input value={f.logoUrl} onChange={(e) => setF({ ...f, logoUrl: e.target.value })} placeholder="https://" /></Field>
          <Field label="Brand colour" error={errors.brandColor} group>
            <div className="flex items-center gap-2"><input type="color" aria-label="Pick brand colour" value={isHexColor(f.brandColor) ? f.brandColor : '#0f766e'} onChange={(e) => setF({ ...f, brandColor: e.target.value })} className="h-9 w-12 cursor-pointer rounded border border-slate-300" /><Input value={f.brandColor} onChange={(e) => setF({ ...f, brandColor: e.target.value })} className="max-w-[9rem]" /></div>
          </Field>
          <Field label="Public roadmap URL name" error={errors.slug} hint={`Your roadmap lives at /roadmap/${slugify(f.slug) || '…'}`}><Input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.publicRoadmap} onChange={(e) => setF({ ...f, publicRoadmap: e.target.checked })} />Make the roadmap public</label>
          <div className="flex justify-end"><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</Button></div>
        </form>
      </Card>
      <Card className="mt-6 border-red-200">
        <h2 className="font-semibold text-red-700">Delete workspace</h2>
        <p className="mt-1 text-sm text-slate-600">Removes all feedback, votes, comments, roadmap items, release notes and members for this workspace.</p>
        <Button variant="danger" className="mt-3" onClick={() => { setTyped(''); setConfirm(true); }}>Delete workspace</Button>
      </Card>
      <ConfirmDialog open={confirm && typed === workspace.name} title="Delete workspace" busy={busy} message={`Delete ${workspace.name} and all of its data? This cannot be undone.`} onCancel={() => { setConfirm(false); setTyped(''); }} onConfirm={remove} />
      {confirm && typed !== workspace.name && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4">
          <div role="dialog" aria-modal="true" className="my-8 w-full max-w-lg rounded-xl bg-surface p-5 shadow-xl">
            <h2 className="font-semibold">Confirm workspace name</h2>
            <p className="mt-2 text-sm text-slate-600">Type <strong>{workspace.name}</strong> to continue.</p>
            <Input className="mt-3" value={typed} onChange={(e) => setTyped(e.target.value)} aria-label="Workspace name" />
            <div className="mt-4 flex justify-end"><Button variant="secondary" onClick={() => { setConfirm(false); setTyped(''); }}>Cancel</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}
