import { FormEvent, useState } from 'react';
import { api, errMsg, logActivity } from '../api/client';
import { useToast } from '../components/Toast';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, Input, Modal, PageHeader, QueryBoundary, Textarea } from '../components/ui';
import { NOTE_STATUS_TONE } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useFetch } from '../hooks/useFetch';
import type { NoteStatus, ReleaseNote, RoadmapItem } from '../types';
import { fmtDate } from '../utils';

const TABS: ('all' | NoteStatus)[] = ['all', 'draft', 'published', 'archived'];

export default function ReleaseNotes() {
  const { workspace, can } = useWorkspace();
  const { user } = useAuth();
  const toast = useToast();
  const manage = can('manageReleases');
  const [tab, setTab] = useState<(typeof TABS)[number]>('all');
  const [editing, setEditing] = useState<ReleaseNote | 'new' | null>(null);
  const [deleting, setDeleting] = useState<ReleaseNote | null>(null);
  const [busy, setBusy] = useState(false);

  const q = useFetch(async () => {
    const p = { workspaceId: workspace.id };
    const [notes, items] = await Promise.all([api.list<ReleaseNote>('releaseNotes', p), api.list<RoadmapItem>('roadmapItems', p)]);
    return { notes, items };
  }, [workspace.id]);

  async function run(fn: () => Promise<void>, ok: string) {
    setBusy(true);
    try { await fn(); toast(ok); q.reload(); } catch (e) { toast(errMsg(e), 'error'); } finally { setBusy(false); }
  }
  const setStatus = (n: ReleaseNote, status: NoteStatus, ok: string) =>
    run(async () => { await api.update<ReleaseNote>('releaseNotes', n.id, { status }); logActivity(workspace.id, user!.id, `${ok.toLowerCase()} release v${n.version}`); }, ok);

  return (
    <>
      <PageHeader title="Release notes" subtitle="Tell customers what shipped" actions={manage && <Button onClick={() => setEditing('new')}>New release note</Button>} />
      <QueryBoundary q={q}>
        {(d) => {
          const visible = d.notes.filter((n) => (manage || n.status === 'published') && (tab === 'all' || n.status === tab))
            .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
          return (
            <>
              {manage && (
                <div className="mb-4 flex gap-2" role="tablist">
                  {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-full px-3 py-1 text-sm capitalize ${tab === t ? 'bg-brand text-white' : 'bg-surface text-slate-600 ring-1 ring-slate-200'}`}>{t}</button>)}
                </div>
              )}
              {visible.length === 0 ? <EmptyState title="No release notes" message={manage ? 'Write one when a feature ships.' : 'Published release notes will appear here.'} /> : (
                <div className="space-y-4">
                  {visible.map((n) => (
                    <Card key={n.id}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2"><h2 className="text-lg font-semibold">v{n.version}</h2><Badge tone={NOTE_STATUS_TONE[n.status]}>{n.status}</Badge><span className="text-sm text-slate-500">{fmtDate(n.releaseDate)}</span></div>
                        {manage && (
                          <div className="flex flex-wrap gap-1">
                            {n.status !== 'published' && n.status !== 'archived' && <Button variant="secondary" disabled={busy} onClick={() => setStatus(n, 'published', 'Published')}>Publish</Button>}
                            {n.status === 'published' && <Button variant="secondary" disabled={busy} onClick={() => setStatus(n, 'archived', 'Archived')}>Archive</Button>}
                            {n.status === 'archived' && <Button variant="secondary" disabled={busy} onClick={() => setStatus(n, 'draft', 'Restored')}>Restore as draft</Button>}
                            <Button variant="ghost" onClick={() => setEditing(n)}>Edit</Button>
                            <Button variant="ghost" className="text-red-600" onClick={() => setDeleting(n)}>Delete</Button>
                          </div>
                        )}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{n.summary}</p>
                      {n.roadmapItemIds.length > 0 && (
                        <div className="mt-3"><p className="text-xs font-medium text-slate-500">Completed features</p>
                          <ul className="mt-1 list-disc pl-5 text-sm">{n.roadmapItemIds.map((id) => <li key={id}>{d.items.find((i) => i.id === id)?.title ?? 'Removed roadmap item'}</li>)}</ul></div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
              {editing && <NoteForm initial={editing === 'new' ? null : editing} completed={d.items.filter((i) => i.stage === 'completed')} existing={d.notes} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); q.reload(); }} />}
            </>
          );
        }}
      </QueryBoundary>
      <ConfirmDialog open={!!deleting} title="Delete release note" busy={busy} message={`Delete the notes for v${deleting?.version}? This cannot be undone.`} onCancel={() => setDeleting(null)}
        onConfirm={() => { const n = deleting!; setDeleting(null); run(async () => { await api.remove('releaseNotes', n.id); logActivity(workspace.id, user!.id, `deleted release v${n.version}`); }, 'Release note deleted'); }} />
    </>
  );
}

function NoteForm({ initial, completed, existing, onClose, onSaved }: { initial: ReleaseNote | null; completed: RoadmapItem[]; existing: ReleaseNote[]; onClose: () => void; onSaved: () => void }) {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const toast = useToast();
  const [version, setVersion] = useState(initial?.version ?? '');
  const [date, setDate] = useState(initial?.releaseDate ?? new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState(initial?.summary ?? '');
  const [ids, setIds] = useState<number[]>(initial?.roadmapItemIds ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!/^\d+\.\d+(\.\d+)?$/.test(version.trim())) er.version = 'Use a version like 1.4 or 1.4.0.';
    else if (existing.some((n) => n.version === version.trim() && n.id !== initial?.id)) er.version = 'This version already has a release note.';
    if (!date) er.date = 'Choose a release date.';
    if (summary.trim().length < 10) er.summary = 'Summarise the release in at least 10 characters.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const body = { version: version.trim(), releaseDate: date, summary: summary.trim(), roadmapItemIds: ids };
      if (initial) await api.update<ReleaseNote>('releaseNotes', initial.id, body);
      else await api.create<ReleaseNote>('releaseNotes', { ...body, workspaceId: workspace.id, status: 'draft' });
      logActivity(workspace.id, user!.id, `${initial ? 'edited' : 'drafted'} release v${body.version}`);
      toast(initial ? 'Release note saved' : 'Release note saved as draft');
      onSaved();
    } catch (err) { setErrors({ form: errMsg(err) }); } finally { setBusy(false); }
  }

  return (
    <Modal open title={initial ? 'Edit release note' : 'New release note'} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {errors.form && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Version" error={errors.version}><Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.5.0" /></Field>
          <Field label="Release date" error={errors.date}><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>
        <Field label="Summary" error={errors.summary}><Textarea rows={5} value={summary} onChange={(e) => setSummary(e.target.value)} /></Field>
        <Field label="Related completed features" group hint="Only completed roadmap items can be attached.">
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {completed.map((i) => <label key={i.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ids.includes(i.id)} onChange={() => setIds((x) => x.includes(i.id) ? x.filter((v) => v !== i.id) : [...x, i.id])} />{i.title}</label>)}
            {completed.length === 0 && <p className="text-sm text-slate-500">No completed roadmap items yet.</p>}
          </div>
        </Field>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save release note'}</Button></div>
      </form>
    </Modal>
  );
}
