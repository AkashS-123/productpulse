import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errMsg, toggleVote } from '../api/client';
import { useToast } from '../components/Toast';
import { Badge, Button, Card, EmptyState, Input, LimitBanner, PageHeader, QueryBoundary, Select, TagPill } from '../components/ui';
import { PRIORITY_LABEL, PRIORITY_TONE, STATUS_LABEL, STATUS_TONE } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useFetch } from '../hooks/useFetch';
import { usePlanLimits } from '../hooks/usePlanLimits';
import type { Category, Feedback, Tag, User, Vote } from '../types';
import { fmtDate, userName } from '../utils';

const PAGE_SIZE = 8;
const EMPTY = { search: '', category: '', tag: '', status: '', priority: '', from: '', to: '', sort: 'newest' };

export default function FeedbackList() {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const toast = useToast();
  const limits = usePlanLimits();
  const [f, setF] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<number | null>(null);

  const q = useFetch(async () => {
    const p = { workspaceId: workspace.id };
    const [feedback, votes, categories, tags, users] = await Promise.all([
      api.list<Feedback>('feedback', p), api.list<Vote>('votes', p), api.list<Category>('categories', p),
      api.list<Tag>('tags', p), api.list<User>('users'),
    ]);
    return { feedback, votes, categories, tags, users };
  }, [workspace.id]);

  const set = (k: keyof typeof EMPTY, v: string) => { setF((p) => ({ ...p, [k]: v })); setPage(1); };

  async function vote(id: number) {
    setBusy(id);
    try {
      const on = await toggleVote(workspace.id, id, user!.id);
      toast(on ? 'Vote added' : 'Vote removed');
      q.reload();
    } catch (e) { toast(errMsg(e), 'error'); } finally { setBusy(null); }
  }

  return (
    <>
      <PageHeader title="Feedback" subtitle="Search, vote on and track customer requests"
        actions={<Link to={`/w/${workspace.id}/feedback/new`} className={limits.atLimit('feedback') ? 'pointer-events-none opacity-50' : ''}><Button>New feedback</Button></Link>} />
      {limits.usage && <LimitBanner label="feedback items" used={limits.usage.feedback} limit={limits.limit.feedback} />}
      <QueryBoundary q={q}>
        {(d) => {
          const count = (id: number) => d.votes.filter((v) => v.feedbackId === id).length;
          const dups = (id: number) => d.feedback.filter((x) => x.duplicateOfId === id).length;
          const s = f.search.trim().toLowerCase();
          const rows = d.feedback.filter((x) =>
            (!s || x.title.toLowerCase().includes(s) || x.description.toLowerCase().includes(s)) &&
            (!f.category || x.categoryId === Number(f.category)) && (!f.tag || x.tagIds.includes(Number(f.tag))) &&
            (!f.status || x.status === f.status) && (!f.priority || x.priority === f.priority) &&
            (!f.from || x.createdAt.slice(0, 10) >= f.from) && (!f.to || x.createdAt.slice(0, 10) <= f.to));
          rows.sort((a, b) => f.sort === 'votes' ? count(b.id) - count(a.id)
            : f.sort === 'oldest' ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt));
          const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
          const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
          const filtered = JSON.stringify(f) !== JSON.stringify(EMPTY);

          return (
            <>
              <Card className="mb-4 space-y-3">
                <Input placeholder="Search by title or description" aria-label="Search feedback" value={f.search} onChange={(e) => set('search', e.target.value)} />
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Select aria-label="Category" value={f.category} onChange={(e) => set('category', e.target.value)}><option value="">All categories</option>{d.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
                  <Select aria-label="Tag" value={f.tag} onChange={(e) => set('tag', e.target.value)}><option value="">All tags</option>{d.tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
                  <Select aria-label="Status" value={f.status} onChange={(e) => set('status', e.target.value)}><option value="">All statuses</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
                  <Select aria-label="Priority" value={f.priority} onChange={(e) => set('priority', e.target.value)}><option value="">All priorities</option>{Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
                  <label className="text-xs text-slate-500">From<Input type="date" value={f.from} onChange={(e) => set('from', e.target.value)} /></label>
                  <label className="text-xs text-slate-500">To<Input type="date" value={f.to} onChange={(e) => set('to', e.target.value)} /></label>
                  <label className="text-xs text-slate-500">Sort by
                    <Select value={f.sort} onChange={(e) => set('sort', e.target.value)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="votes">Most votes</option></Select>
                  </label>
                  <div className="flex items-end">{filtered && <Button variant="ghost" onClick={() => { setF(EMPTY); setPage(1); }}>Clear filters</Button>}</div>
                </div>
              </Card>
              {rows.length === 0 ? (
                <EmptyState title={d.feedback.length ? 'No feedback matches these filters' : 'No feedback yet'}
                  message={d.feedback.length ? 'Try a different search or clear the filters.' : 'Be the first to share an idea.'} />
              ) : (
                <ul className="space-y-3">
                  {shown.map((x) => {
                    const voted = d.votes.some((v) => v.feedbackId === x.id && v.userId === user!.id);
                    const cat = d.categories.find((c) => c.id === x.categoryId);
                    return (
                      <li key={x.id}>
                        <Card className="flex gap-4 p-4">
                          <button onClick={() => vote(x.id)} disabled={busy === x.id} aria-pressed={voted} aria-label={voted ? 'Remove your vote' : 'Vote for this request'}
                            className={`flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-lg border text-sm font-semibold transition disabled:opacity-50 ${voted ? 'border-brand bg-brand-soft text-brand' : 'border-slate-300 hover:bg-slate-50'}`}>
                            <span aria-hidden>▲</span>{count(x.id)}
                          </button>
                          <div className="min-w-0 flex-1">
                            <Link to={`/w/${workspace.id}/feedback/${x.id}`} className="font-semibold hover:underline">{x.title}</Link>
                            <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{x.description}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Badge tone={STATUS_TONE[x.status]}>{STATUS_LABEL[x.status]}</Badge>
                              <Badge tone={PRIORITY_TONE[x.priority]}>{PRIORITY_LABEL[x.priority]}</Badge>
                              {cat && <Badge>{cat.name}</Badge>}
                              {x.duplicateOfId && <Badge tone="purple">Duplicate</Badge>}
                              {dups(x.id) > 0 && <Badge tone="purple">{dups(x.id)} linked duplicate{dups(x.id) > 1 ? 's' : ''}</Badge>}
                              {x.tagIds.map((id) => { const t = d.tags.find((tg) => tg.id === id); return t && <TagPill key={id}>{t.name}</TagPill>; })}
                              <span className="text-xs text-slate-400">{userName(d.users, x.submitterId)} · {fmtDate(x.createdAt)}</span>
                            </div>
                          </div>
                        </Card>
                      </li>
                    );
                  })}
                </ul>
              )}
              {pages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-3 text-sm">
                  <Button variant="secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
                  <span>Page {page} of {pages}</span>
                  <Button variant="secondary" disabled={page === pages} onClick={() => setPage(page + 1)}>Next</Button>
                </div>
              )}
            </>
          );
        }}
      </QueryBoundary>
    </>
  );
}
