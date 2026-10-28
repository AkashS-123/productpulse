import { FormEvent, useState } from 'react';
import { api, errMsg, logActivity } from '../api/client';
import { useToast } from '../components/Toast';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, Input, LimitBanner, Modal, PageHeader, QueryBoundary, Select, Textarea } from '../components/ui';
import { STAGE_LABEL, STAGES, STAGE_TO_STATUS } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useFetch } from '../hooks/useFetch';
import { usePlanLimits } from '../hooks/usePlanLimits';
import type { Feedback, RoadmapItem, Stage, Vote } from '../types';

export default function RoadmapBoard() {
  const { workspace, can } = useWorkspace();
  const { user } = useAuth();
  const toast = useToast();
  const limits = usePlanLimits();
  const manage = can('manageRoadmap');
  const [editing, setEditing] = useState<RoadmapItem | 'new' | null>(null);
  const [deleting, setDeleting] = useState<RoadmapItem | null>(null);
  const [busy, setBusy] = useState(false);

  const q = useFetch(async () => {
    const p = { workspaceId: workspace.id };
    const [items, feedback, votes] = await Promise.all([api.list<RoadmapItem>('roadmapItems', p), api.list<Feedback>('feedback', p), api.list<Vote>('votes', p)]);
    return { items, feedback, votes };
  }, [workspace.id]);

  async function move(item: RoadmapItem, dir: -1 | 1, fb: Feedback[]) {
    const idx = STAGES.findIndex((s) => s.key === item.stage) + dir;
    if (idx < 0 || idx >= STAGES.length) return;
    const stage = STAGES[idx].key;
    setBusy(true);
    try {
      await api.update<RoadmapItem>('roadmapItems', item.id, { stage });
      await Promise.all(item.feedbackIds.filter((id) => fb.some((f) => f.id === id)).map((id) => api.update<Feedback>('feedback', id, { status: STAGE_TO_STATUS[stage] })));
      logActivity(workspace.id, user!.id, `moved “${item.title}” to ${STAGE_LABEL[stage]}`);
      toast(`Moved to ${STAGE_LABEL[stage]}`);
      q.reload();
    } catch (e) { toast(errMsg(e), 'error'); } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="Roadmap board" subtitle={manage ? 'Plan work and move items through each stage' : 'What the team is working on'}
        actions={manage && <Button disabled={limits.atLimit('roadmap')} onClick={() => setEditing('new')}>New roadmap item</Button>} />
      {manage && limits.usage && <LimitBanner label="roadmap items" used={limits.usage.roadmap} limit={limits.limit.roadmap} />}
      <QueryBoundary q={q}>
        {(d) => {
          const items = manage ? d.items : d.items.filter((i) => i.published);
          if (items.length === 0 && !manage) return <EmptyState title="Nothing on the roadmap yet" message="Published roadmap items will show up here." />;
          return (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {STAGES.map((s) => (
                <section key={s.key} aria-label={s.label} className="rounded-xl bg-slate-100 p-3">
                  <h2 className="mb-3 flex items-center justify-between text-sm font-semibold"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />{s.label}</span><span className="text-slate-500">{items.filter((i) => i.stage === s.key).length}</span></h2>
                  <div className="space-y-3">
                    {items.filter((i) => i.stage === s.key).map((i) => {
                      const linked = i.feedbackIds.filter((id) => d.feedback.some((f) => f.id === id));
                      const votes = linked.reduce((n, id) => n + d.votes.filter((v) => v.feedbackId === id).length, 0);
                      return (
                        <Card key={i.id} className="hover-lift p-3">
                          <p className="text-sm font-medium">{i.title}</p>
                          <p className="mt-1 line-clamp-3 text-xs text-slate-500">{i.description}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5"><Badge>{linked.length} linked</Badge><Badge>{votes} votes</Badge>{manage && <Badge tone={i.published ? 'green' : 'amber'}>{i.published ? 'Published' : 'Hidden'}</Badge>}</div>
                          {manage && (
                            <div className="mt-3 flex items-center justify-between">
                              <span className="flex gap-1">
                                <Button variant="secondary" className="px-2 py-1" aria-label="Move to previous stage" disabled={busy || s.key === STAGES[0].key} onClick={() => move(i, -1, d.feedback)}>←</Button>
                                <Button variant="secondary" className="px-2 py-1" aria-label="Move to next stage" disabled={busy || s.key === STAGES[3].key} onClick={() => move(i, 1, d.feedback)}>→</Button>
                              </span>
                              <span className="flex gap-1"><Button variant="ghost" className="px-2 py-1" onClick={() => setEditing(i)}>Edit</Button><Button variant="ghost" className="px-2 py-1 text-red-600" onClick={() => setDeleting(i)}>Delete</Button></span>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </section>
              ))}
              {editing && <ItemForm initial={editing === 'new' ? null : editing} feedback={d.feedback} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); q.reload(); limits.reload(); }} />}
            </div>
          );
        }}
      </QueryBoundary>
      <ConfirmDialog open={!!deleting} title="Delete roadmap item" busy={busy} message={`Delete “${deleting?.title}”? Linked feedback is not deleted.`} onCancel={() => setDeleting(null)}
        onConfirm={async () => { const i = deleting!; setBusy(true); try { await api.remove('roadmapItems', i.id); logActivity(workspace.id, user!.id, `deleted roadmap item “${i.title}”`); toast('Roadmap item deleted'); setDeleting(null); q.reload(); limits.reload(); } catch (e) { toast(errMsg(e), 'error'); } finally { setBusy(false); } }} />
    </>
  );
}

function ItemForm({ initial, feedback, onClose, onSaved }: { initial: RoadmapItem | null; feedback: Feedback[]; onClose: () => void; onSaved: () => void }) {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const toast = useToast();
  const limits = usePlanLimits();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [stage, setStage] = useState<Stage>(initial?.stage ?? 'under_review');
  const [published, setPublished] = useState(initial?.published ?? false);
  const [ids, setIds] = useState<number[]>(initial?.feedbackIds ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (title.trim().length < 3) er.title = 'Title must be at least 3 characters.';
    if (description.trim().length < 10) er.description = 'Add a short description (10+ characters).';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const body = { title: title.trim(), description: description.trim(), stage, published, feedbackIds: ids };
      if (initial) { await api.update<RoadmapItem>('roadmapItems', initial.id, body); }
      else {
        if ((await limits.fresh('roadmap')) >= limits.limit.roadmap) { setErrors({ form: `Your plan allows ${limits.limit.roadmap} roadmap items. Upgrade to add more.` }); return; }
        await api.create<RoadmapItem>('roadmapItems', { ...body, workspaceId: workspace.id, createdAt: new Date().toISOString() });
      }
      logActivity(workspace.id, user!.id, `${initial ? 'updated' : 'created'} roadmap item “${body.title}”`);
      toast(initial ? 'Roadmap item saved' : 'Roadmap item created');
      onSaved();
    } catch (err) { setErrors({ form: errMsg(err) }); } finally { setBusy(false); }
  }

  const primaries = feedback.filter((f) => !f.duplicateOfId);
  return (
    <Modal open title={initial ? 'Edit roadmap item' : 'New roadmap item'} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {errors.form && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</p>}
        <Field label="Title" error={errors.title}><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Description" error={errors.description}><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Stage"><Select value={stage} onChange={(e) => setStage(e.target.value as Stage)}>{STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select></Field>
          <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />Show on the public roadmap</label>
        </div>
        <Field label="Linked feedback" group hint="Choose the requests this item delivers.">
          <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {primaries.map((f) => (
              <label key={f.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ids.includes(f.id)} onChange={() => setIds((x) => x.includes(f.id) ? x.filter((i) => i !== f.id) : [...x, f.id])} />{f.title}</label>
            ))}
            {primaries.length === 0 && <p className="text-sm text-slate-500">No feedback to link yet.</p>}
          </div>
        </Field>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save item'}</Button></div>
      </form>
    </Modal>
  );
}
