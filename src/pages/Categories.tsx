import { FormEvent, useState } from 'react';
import { api, errMsg } from '../api/client';
import { useToast } from '../components/Toast';
import { Button, Card, ConfirmDialog, EmptyState, Field, Input, PageHeader, QueryBoundary } from '../components/ui';
import { useWorkspace } from '../context/WorkspaceContext';
import { useFetch } from '../hooks/useFetch';
import type { Category, Feedback, Tag } from '../types';
import { isHexColor } from '../utils';

export default function Categories() {
  const { workspace } = useWorkspace();
  const toast = useToast();
  const q = useFetch(async () => {
    const p = { workspaceId: workspace.id };
    const [categories, tags, feedback] = await Promise.all([api.list<Category>('categories', p), api.list<Tag>('tags', p), api.list<Feedback>('feedback', p)]);
    return { categories, tags, feedback };
  }, [workspace.id]);

  const [catForm, setCatForm] = useState<{ id?: number; name: string; color: string }>({ name: '', color: '#2563eb' });
  const [tagForm, setTagForm] = useState<{ id?: number; name: string }>({ name: '' });
  const [errors, setErrors] = useState<{ cat?: string; tag?: string }>({});
  const [delCat, setDelCat] = useState<Category | null>(null);
  const [delTag, setDelTag] = useState<Tag | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>, ok: string) {
    setBusy(true);
    try { await fn(); toast(ok); q.reload(); } catch (e) { toast(errMsg(e), 'error'); } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="Categories & tags" subtitle="Organise feedback so it is easy to filter and report on" />
      <QueryBoundary q={q}>
        {(d) => {
          async function saveCat(e: FormEvent) {
            e.preventDefault();
            const name = catForm.name.trim();
            if (name.length < 2) return setErrors({ cat: 'Category name must be at least 2 characters.' });
            if (!isHexColor(catForm.color)) return setErrors({ cat: 'Pick a valid colour.' });
            if (d.categories.some((c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== catForm.id)) return setErrors({ cat: 'A category with this name already exists.' });
            setErrors({});
            await run(async () => {
              if (catForm.id) await api.update<Category>('categories', catForm.id, { name, color: catForm.color });
              else await api.create<Category>('categories', { workspaceId: workspace.id, name, color: catForm.color });
              setCatForm({ name: '', color: '#2563eb' });
            }, catForm.id ? 'Category updated' : 'Category added');
          }
          async function saveTag(e: FormEvent) {
            e.preventDefault();
            const name = tagForm.name.trim().toLowerCase();
            if (name.length < 2) return setErrors({ tag: 'Tag name must be at least 2 characters.' });
            if (d.tags.some((t) => t.name === name && t.id !== tagForm.id)) return setErrors({ tag: 'A tag with this name already exists.' });
            setErrors({});
            await run(async () => {
              if (tagForm.id) await api.update<Tag>('tags', tagForm.id, { name });
              else await api.create<Tag>('tags', { workspaceId: workspace.id, name });
              setTagForm({ name: '' });
            }, tagForm.id ? 'Tag updated' : 'Tag added');
          }
          const inUse = delCat ? d.feedback.filter((f) => f.categoryId === delCat.id).length : 0;

          return (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <h2 className="mb-3 font-semibold">Categories</h2>
                <form onSubmit={saveCat} className="mb-4 flex flex-wrap items-start gap-2" noValidate>
                  <div className="min-w-0 flex-1"><Field label={catForm.id ? 'Edit category' : 'New category'} error={errors.cat}><Input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} /></Field></div>
                  <div className="pt-6"><input type="color" aria-label="Category colour" value={catForm.color} onChange={(e) => setCatForm({ ...catForm, color: e.target.value })} className="h-9 w-12 cursor-pointer rounded border border-slate-300" /></div>
                  <div className="flex gap-2 pt-6"><Button type="submit" disabled={busy}>{catForm.id ? 'Save' : 'Add'}</Button>{catForm.id && <Button variant="secondary" onClick={() => { setCatForm({ name: '', color: '#2563eb' }); setErrors({}); }}>Cancel</Button>}</div>
                </form>
                {d.categories.length === 0 ? <EmptyState title="No categories" message="Add one so feedback can be grouped." /> : (
                  <ul className="divide-y divide-slate-100">
                    {d.categories.map((c) => (
                      <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                        <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: c.color }} />{c.name}<span className="text-xs text-slate-400">{d.feedback.filter((f) => f.categoryId === c.id).length} items</span></span>
                        <span className="flex gap-1"><Button variant="ghost" onClick={() => setCatForm(c)}>Edit</Button><Button variant="ghost" className="text-red-600" onClick={() => setDelCat(c)}>Delete</Button></span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card>
                <h2 className="mb-3 font-semibold">Tags</h2>
                <form onSubmit={saveTag} className="mb-4 flex items-start gap-2" noValidate>
                  <div className="min-w-0 flex-1"><Field label={tagForm.id ? 'Edit tag' : 'New tag'} error={errors.tag}><Input value={tagForm.name} onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })} /></Field></div>
                  <div className="flex gap-2 pt-6"><Button type="submit" disabled={busy}>{tagForm.id ? 'Save' : 'Add'}</Button>{tagForm.id && <Button variant="secondary" onClick={() => { setTagForm({ name: '' }); setErrors({}); }}>Cancel</Button>}</div>
                </form>
                {d.tags.length === 0 ? <EmptyState title="No tags" message="Tags add a second way to slice feedback." /> : (
                  <ul className="divide-y divide-slate-100">
                    {d.tags.map((t) => (
                      <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                        <span>#{t.name} <span className="text-xs text-slate-400">{d.feedback.filter((f) => f.tagIds.includes(t.id)).length} items</span></span>
                        <span className="flex gap-1"><Button variant="ghost" onClick={() => setTagForm(t)}>Edit</Button><Button variant="ghost" className="text-red-600" onClick={() => setDelTag(t)}>Delete</Button></span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <ConfirmDialog open={!!delCat} title="Delete category" busy={busy} confirmLabel={inUse ? 'Delete anyway' : 'Delete'}
                message={inUse ? `${inUse} feedback item(s) use “${delCat?.name}”. They will show without a category if you delete it.` : `Delete the category “${delCat?.name}”?`}
                onCancel={() => setDelCat(null)} onConfirm={() => { const c = delCat!; setDelCat(null); run(() => api.remove('categories', c.id), 'Category deleted'); }} />
              <ConfirmDialog open={!!delTag} title="Delete tag" busy={busy} message={`Delete the tag “${delTag?.name}”? It is removed from all feedback.`}
                onCancel={() => setDelTag(null)}
                onConfirm={() => { const t = delTag!; setDelTag(null); run(async () => {
                  await Promise.all(d.feedback.filter((f) => f.tagIds.includes(t.id)).map((f) => api.update<Feedback>('feedback', f.id, { tagIds: f.tagIds.filter((x) => x !== t.id) })));
                  await api.remove('tags', t.id);
                }, 'Tag deleted'); }} />
            </div>
          );
        }}
      </QueryBoundary>
    </>
  );
}
