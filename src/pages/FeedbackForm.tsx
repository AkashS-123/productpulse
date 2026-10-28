import { FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, errMsg, logActivity } from '../api/client';
import { useToast } from '../components/Toast';
import { Button, Card, EmptyState, Field, Input, PageHeader, QueryBoundary, Select, Textarea } from '../components/ui';
import { PRIORITY_LABEL, STATUS_LABEL } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useFetch } from '../hooks/useFetch';
import { usePlanLimits } from '../hooks/usePlanLimits';
import type { Category, Feedback, FeedbackStatus, Priority, Tag } from '../types';

export default function FeedbackForm() {
  const { id } = useParams();
  const { workspace } = useWorkspace();
  const q = useFetch(async () => {
    const p = { workspaceId: workspace.id };
    const [categories, tags, existing] = await Promise.all([
      api.list<Category>('categories', p), api.list<Tag>('tags', p), id ? api.get<Feedback>('feedback', id) : Promise.resolve(null),
    ]);
    return { categories, tags, existing };
  }, [workspace.id, id]);
  return (
    <QueryBoundary q={q}>{(d) => <Body categories={d.categories} tags={d.tags} existing={d.existing} />}</QueryBoundary>
  );
}

function Body({ categories, tags, existing }: { categories: Category[]; tags: Tag[]; existing: Feedback | null }) {
  const { workspace, can } = useWorkspace();
  const { user } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const limits = usePlanLimits();
  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [categoryId, setCategoryId] = useState(existing ? String(existing.categoryId) : '');
  const [tagIds, setTagIds] = useState<number[]>(existing?.tagIds ?? []);
  const [priority, setPriority] = useState<Priority>(existing?.priority ?? 'medium');
  const [status, setStatus] = useState<FeedbackStatus>(existing?.status ?? 'open');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const triage = can('triage');
  const base = `/w/${workspace.id}/feedback`;

  if (existing && existing.workspaceId !== workspace.id) return <EmptyState title="Feedback not found" />;
  if (existing && !(existing.submitterId === user!.id || can('editAnyFeedback') || triage)) {
    return <EmptyState title="You cannot edit this feedback" message="Only the person who submitted it, or a product manager or admin, can change it." action={<Link to={`${base}/${existing.id}`} className="underline">Back to feedback</Link>} />;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (title.trim().length < 5) er.title = 'Title must be at least 5 characters.';
    if (title.trim().length > 120) er.title = 'Title must be 120 characters or fewer.';
    if (description.trim().length < 10) er.description = 'Describe the request in at least 10 characters.';
    if (!categoryId) er.categoryId = 'Choose a category.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      if (existing) {
        await api.update<Feedback>('feedback', existing.id, {
          title: title.trim(), description: description.trim(), categoryId: Number(categoryId), tagIds,
          ...(triage ? { priority, status } : {}),
        });
        logActivity(workspace.id, user!.id, `edited feedback “${title.trim()}”`);
        toast('Feedback saved');
        nav(`${base}/${existing.id}`);
      } else {
        if ((await limits.fresh('feedback')) >= limits.limit.feedback) {
          setErrors({ form: `Your plan allows ${limits.limit.feedback} feedback items. Ask the workspace owner to upgrade.` });
          return;
        }
        const created = await api.create<Feedback>('feedback', {
          workspaceId: workspace.id, title: title.trim(), description: description.trim(), categoryId: Number(categoryId),
          submitterId: user!.id, tagIds, priority: triage ? priority : 'medium', status: 'open',
          createdAt: new Date().toISOString(), duplicateOfId: null,
        });
        logActivity(workspace.id, user!.id, `submitted feedback “${created.title}”`);
        toast('Feedback submitted');
        nav(`${base}/${created.id}`);
      }
    } catch (err) {
      setErrors({ form: errMsg(err) });
    } finally {
      setBusy(false);
    }
  }

  const toggleTag = (tid: number) => setTagIds((t) => (t.includes(tid) ? t.filter((x) => x !== tid) : [...t, tid]));

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={existing ? 'Edit feedback' : 'New feedback'} />
      <Card>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {errors.form && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</p>}
          <Field label="Title" error={errors.title}><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} /></Field>
          <Field label="Description" error={errors.description}><Textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
          <Field label="Category" error={errors.categoryId}>
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Select a category</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Tags" group>
            <div className="flex flex-wrap gap-3">
              {tags.map((t) => (
                <label key={t.id} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={tagIds.includes(t.id)} onChange={() => toggleTag(t.id)} />{t.name}</label>
              ))}
              {tags.length === 0 && <span className="text-sm text-slate-500">No tags yet.</span>}
            </div>
          </Field>
          {triage && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Priority"><Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>{Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
              {existing && <Field label="Status"><Select value={status} onChange={(e) => setStatus(e.target.value as FeedbackStatus)}>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => nav(existing ? `${base}/${existing.id}` : base)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Saving…' : existing ? 'Save changes' : 'Submit feedback'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
