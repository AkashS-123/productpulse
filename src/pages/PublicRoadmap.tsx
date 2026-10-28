import { CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import ThemeToggle from '../components/ThemeToggle';
import { Badge, Card, EmptyState, ErrorState, Spinner } from '../components/ui';
import { NOTE_STATUS_TONE, STAGES } from '../constants';
import { useFetch } from '../hooks/useFetch';
import type { ReleaseNote, RoadmapItem, Vote, Workspace } from '../types';
import { fmtDate } from '../utils';

export default function PublicRoadmap() {
  const { slug } = useParams();
  const q = useFetch(async () => {
    const ws = (await api.list<Workspace>('workspaces', { slug }))[0];
    if (!ws) return { ws: null as Workspace | null, items: [] as RoadmapItem[], notes: [] as ReleaseNote[], votes: [] as Vote[] };
    const p = { workspaceId: ws.id };
    const [items, notes, votes] = await Promise.all([
      api.list<RoadmapItem>('roadmapItems', { ...p, published: true }), api.list<ReleaseNote>('releaseNotes', { ...p, status: 'published' }),
      api.list<Vote>('votes', p),
    ]);
    return { ws, items, notes, votes };
  }, [slug]);

  if (q.error) return <div className="mx-auto max-w-lg p-8"><ErrorState message={q.error} onRetry={q.reload} /></div>;
  if (!q.data) return <Spinner />;
  const { ws, items, notes, votes } = q.data;
  if (!ws) return <div className="mx-auto max-w-lg p-8"><EmptyState title="Roadmap not found" message="Check the link and try again." action={<Link to="/login" className="underline">Go to login</Link>} /></div>;
  if (!ws.publicRoadmap) return <div className="mx-auto max-w-lg p-8"><EmptyState title="This roadmap is private" message={`${ws.name} has not made its roadmap public.`} /></div>;

  const votesFor = (it: RoadmapItem) => it.feedbackIds.reduce((n, id) => n + votes.filter((v) => v.feedbackId === id).length, 0);

  return (
    <div className="min-h-screen" style={{ '--brand': ws.brandColor } as CSSProperties}>
      <header className="border-b border-slate-200 bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 p-4 md:px-8">
          <div className="flex items-center gap-3">
            {ws.logoUrl ? <img src={ws.logoUrl} alt="" className="h-10 w-10 rounded-lg object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              : <div className="flex h-10 w-10 items-center justify-center rounded-xl brand-gradient font-bold text-white">{ws.name[0]}</div>}
            <div><h1 className="text-xl font-bold">{ws.name} roadmap</h1><p className="text-sm text-slate-500">{ws.description}</p></div>
          </div>
          <div className="flex items-center gap-3"><Link to="/login" className="text-sm underline">Sign in to vote</Link><ThemeToggle /></div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-10 p-4 md:p-8">
        {items.length === 0 ? <EmptyState title="Nothing published yet" message="Check back soon for upcoming work." /> : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {STAGES.map((s) => (
              <section key={s.key} aria-label={s.label}>
                <h2 className="mb-3 flex items-center gap-2 font-semibold"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />{s.label}</h2>
                <div className="space-y-3">
                  {items.filter((i) => i.stage === s.key).map((i) => (
                    <Card key={i.id} className="hover-lift p-4">
                      <p className="font-medium">{i.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{i.description}</p>
                      <p className="mt-2 text-xs text-slate-400">{votesFor(i)} customer votes</p>
                    </Card>
                  ))}
                  {items.filter((i) => i.stage === s.key).length === 0 && <p className="text-sm text-slate-400">No items</p>}
                </div>
              </section>
            ))}
          </div>
        )}
        {notes.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold">Release notes</h2>
            <div className="space-y-3">
              {[...notes].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate)).map((n) => (
                <Card key={n.id}>
                  <div className="flex items-center gap-2"><span className="font-semibold">v{n.version}</span><Badge tone={NOTE_STATUS_TONE[n.status]}>Released {fmtDate(n.releaseDate)}</Badge></div>
                  <p className="mt-2 text-sm text-slate-600">{n.summary}</p>
                  {n.roadmapItemIds.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">{n.roadmapItemIds.map((id) => <li key={id}>{items.find((i) => i.id === id)?.title ?? 'Completed feature'}</li>)}</ul>}
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
