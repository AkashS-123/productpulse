import { FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, deleteFeedbackCascade, errMsg, logActivity, toggleVote } from '../api/client';
import { useToast } from '../components/Toast';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, PageHeader, QueryBoundary, Select, Textarea, TagPill } from '../components/ui';
import { PRIORITY_LABEL, PRIORITY_TONE, STATUS_LABEL, STATUS_TONE } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useFetch } from '../hooks/useFetch';
import type { Category, Comment, Feedback, FeedbackStatus, Priority, Tag, User, Vote } from '../types';
import { fmtDate, userName } from '../utils';

export default function FeedbackDetail() {
  const { id } = useParams();
  const { workspace, can } = useWorkspace();
  const { user } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const base = `/w/${workspace.id}/feedback`;
  const [comment, setComment] = useState('');
  const [commentErr, setCommentErr] = useState('');
  const [dupTarget, setDupTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingComment, setDeletingComment] = useState<Comment | null>(null);

  const q = useFetch(async () => {
    const fb = await api.get<Feedback>('feedback', id!);
    const p = { workspaceId: workspace.id };
    const [votes, comments, duplicates, categories, tags, users, all] = await Promise.all([
      api.list<Vote>('votes', { feedbackId: fb.id }), api.list<Comment>('comments', { feedbackId: fb.id }),
      api.list<Feedback>('feedback', { duplicateOfId: fb.id }), api.list<Category>('categories', p), api.list<Tag>('tags', p),
      api.list<User>('users'), api.list<Feedback>('feedback', p),
    ]);
    const primary = fb.duplicateOfId ? all.find((x) => x.id === fb.duplicateOfId) ?? null : null;
    return { fb, votes, comments, duplicates, categories, tags, users, all, primary };
  }, [id, workspace.id]);

  async function run(fn: () => Promise<void>, ok: string) {
    setBusy(true);
    try { await fn(); toast(ok); q.reload(); } catch (e) { toast(errMsg(e), 'error'); } finally { setBusy(false); }
  }

  return (
    <QueryBoundary q={q}>
      {(d) => {
        const fb = d.fb;
        if (fb.workspaceId !== workspace.id) return <EmptyState title="Feedback not found" action={<Link to={base} className="underline">Back to feedback</Link>} />;
        const voted = d.votes.some((v) => v.userId === user!.id);
        const triage = can('triage');
        const own = fb.submitterId === user!.id;
        const canEdit = own || can('editAnyFeedback') || triage;
        const canDelete = own || can('editAnyFeedback');
        const cat = d.categories.find((c) => c.id === fb.categoryId);
        const candidates = d.all.filter((x) => x.id !== fb.id && !x.duplicateOfId);

        const patch = (body: Partial<Feedback>, msg: string, log: string) =>
          run(async () => { await api.update<Feedback>('feedback', fb.id, body); logActivity(workspace.id, user!.id, log); }, msg);

        async function addComment(e: FormEvent) {
          e.preventDefault();
          if (comment.trim().length < 2) { setCommentErr('Write a comment before posting.'); return; }
          if (comment.length > 500) { setCommentErr('Comments are limited to 500 characters.'); return; }
          setCommentErr('');
          await run(async () => {
            await api.create<Comment>('comments', { workspaceId: workspace.id, feedbackId: fb.id, userId: user!.id, body: comment.trim(), createdAt: new Date().toISOString() });
            logActivity(workspace.id, user!.id, `commented on “${fb.title}”`);
            setComment('');
          }, 'Comment posted');
        }

        return (
          <div className="mx-auto max-w-3xl">
            <Link to={base} className="mb-3 inline-block text-sm text-slate-500 underline">← All feedback</Link>
            <PageHeader title={fb.title}
              actions={<>
                {canEdit && <Link to={`${base}/${fb.id}/edit`}><Button variant="secondary">Edit</Button></Link>}
                {canDelete && <Button variant="danger" onClick={() => setConfirmDelete(true)}>Delete</Button>}
              </>} />
            <Card>
              <div className="flex gap-4">
                <button disabled={busy} aria-pressed={voted} onClick={() => run(async () => { await toggleVote(workspace.id, fb.id, user!.id); }, voted ? 'Vote removed' : 'Vote added')}
                  className={`flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-lg border text-sm font-semibold disabled:opacity-50 ${voted ? 'border-brand bg-brand-soft text-brand' : 'border-slate-300 hover:bg-slate-50'}`}>
                  <span aria-hidden>▲</span>{d.votes.length}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap text-slate-700">{fb.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge tone={STATUS_TONE[fb.status]}>{STATUS_LABEL[fb.status]}</Badge>
                    <Badge tone={PRIORITY_TONE[fb.priority]}>{PRIORITY_LABEL[fb.priority]} priority</Badge>
                    {cat && <Badge>{cat.name}</Badge>}
                    {fb.tagIds.map((tid) => { const t = d.tags.find((x) => x.id === tid); return t && <TagPill key={tid}>{t.name}</TagPill>; })}
                  </div>
                  <p className="mt-3 text-xs text-slate-400">Submitted by {userName(d.users, fb.submitterId)} on {fmtDate(fb.createdAt)}</p>
                </div>
              </div>
            </Card>

            {triage && (
              <Card className="mt-4">
                <h2 className="mb-3 font-semibold">Review</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Status"><Select value={fb.status} disabled={busy} onChange={(e) => patch({ status: e.target.value as FeedbackStatus }, 'Status updated', `set “${fb.title}” to ${STATUS_LABEL[e.target.value as FeedbackStatus]}`)}>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
                  <Field label="Priority"><Select value={fb.priority} disabled={busy} onChange={(e) => patch({ priority: e.target.value as Priority }, 'Priority updated', `changed priority of “${fb.title}”`)}>{Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
                </div>
              </Card>
            )}

            <Card className="mt-4">
              <h2 className="mb-2 font-semibold">Duplicates</h2>
              {fb.duplicateOfId ? (
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>Linked to primary request: {d.primary ? <Link className="font-medium underline" to={`${base}/${d.primary.id}`}>{d.primary.title}</Link> : 'a deleted request'}</span>
                  {triage && <Button variant="secondary" disabled={busy} onClick={() => patch({ duplicateOfId: null }, 'Duplicate unlinked', `unlinked “${fb.title}” from its primary request`)}>Unlink</Button>}
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-600">{d.duplicates.length} linked duplicate{d.duplicates.length === 1 ? '' : 's'}</p>
                  <ul className="mt-2 space-y-1 text-sm">{d.duplicates.map((x) => <li key={x.id}><Link className="underline" to={`${base}/${x.id}`}>{x.title}</Link></li>)}</ul>
                  {triage && d.duplicates.length === 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Select aria-label="Primary request" className="max-w-sm" value={dupTarget} onChange={(e) => setDupTarget(e.target.value)}>
                        <option value="">Mark as duplicate of…</option>{candidates.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
                      </Select>
                      <Button variant="secondary" disabled={!dupTarget || busy} onClick={() => patch({ duplicateOfId: Number(dupTarget) }, 'Linked as duplicate', `linked “${fb.title}” as a duplicate`)}>Link duplicate</Button>
                    </div>
                  )}
                  {triage && d.duplicates.length > 0 && <p className="mt-2 text-xs text-slate-500">This is a primary request, so it cannot be marked as a duplicate itself.</p>}
                </>
              )}
            </Card>

            <Card className="mt-4">
              <h2 className="mb-3 font-semibold">Comments ({d.comments.length})</h2>
              <ul className="space-y-4">
                {[...d.comments].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((c) => (
                  <li key={c.id} className="text-sm">
                    <p><span className="font-medium">{userName(d.users, c.userId)}</span> <span className="text-xs text-slate-400">{fmtDate(c.createdAt)}</span>
                      {(c.userId === user!.id || can('editAnyFeedback')) && <button className="ml-2 text-xs text-red-600 underline" onClick={() => setDeletingComment(c)}>Delete</button>}</p>
                    <p className="mt-0.5 whitespace-pre-wrap text-slate-700">{c.body}</p>
                  </li>
                ))}
                {d.comments.length === 0 && <li className="text-sm text-slate-500">No comments yet. Start the conversation.</li>}
              </ul>
              <form onSubmit={addComment} className="mt-4 space-y-2" noValidate>
                <Field label="Add a comment" error={commentErr}><Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
                <div className="flex justify-end"><Button type="submit" disabled={busy}>Post comment</Button></div>
              </form>
            </Card>

            <ConfirmDialog open={confirmDelete} title="Delete feedback" busy={busy} message={`Delete “${fb.title}”? Its votes and comments are removed too. This cannot be undone.`}
              onCancel={() => setConfirmDelete(false)}
              onConfirm={async () => { setBusy(true); try { await deleteFeedbackCascade(fb.id); logActivity(workspace.id, user!.id, `deleted feedback “${fb.title}”`); toast('Feedback deleted'); nav(base); } catch (e) { toast(errMsg(e), 'error'); setBusy(false); } }} />
            <ConfirmDialog open={!!deletingComment} title="Delete comment" busy={busy} message="Delete this comment? This cannot be undone." onCancel={() => setDeletingComment(null)}
              onConfirm={() => { const c = deletingComment!; setDeletingComment(null); run(() => api.remove('comments', c.id), 'Comment deleted'); }} />
          </div>
        );
      }}
    </QueryBoundary>
  );
}
