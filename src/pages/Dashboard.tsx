import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { api } from '../api/client';
import { Card, EmptyState, PageHeader, ProgressBar, QueryBoundary } from '../components/ui';
import { CLOSED_STATUSES, STAGES } from '../constants';
import { useWorkspace } from '../context/WorkspaceContext';
import { useFetch } from '../hooks/useFetch';
import type { ActivityLog, Category, Feedback, RoadmapItem, User, Vote } from '../types';
import { fmtDate, userName } from '../utils';

export default function Dashboard() {
  const { workspace } = useWorkspace();
  const q = useFetch(async () => {
    const p = { workspaceId: workspace.id };
    const [feedback, votes, categories, roadmap, logs, users] = await Promise.all([
      api.list<Feedback>('feedback', p), api.list<Vote>('votes', p), api.list<Category>('categories', p),
      api.list<RoadmapItem>('roadmapItems', p), api.list<ActivityLog>('activityLogs', p), api.list<User>('users'),
    ]);
    return { feedback, votes, categories, roadmap, logs, users };
  }, [workspace.id]);

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`How ${workspace.name} customers are responding`} />
      <QueryBoundary q={q}>
        {(d) => {
          const open = d.feedback.filter((f) => !CLOSED_STATUSES.includes(f.status)).length;
          const completed = d.roadmap.filter((r) => r.stage === 'completed').length;
          const progress = d.roadmap.length ? Math.round((completed / d.roadmap.length) * 100) : 0;
          const byCategory = d.categories.map((c) => ({ name: c.name, count: d.feedback.filter((f) => f.categoryId === c.id).length, color: c.color }));
          const byStage = STAGES.map((s) => ({ name: s.label, value: d.roadmap.filter((r) => r.stage === s.key).length, color: s.color })).filter((s) => s.value > 0);
          const top = d.feedback.map((f) => ({ f, v: d.votes.filter((x) => x.feedbackId === f.id).length })).sort((a, b) => b.v - a.v).slice(0, 5);
          const stats = [
            { label: 'Total feedback', value: d.feedback.length }, { label: 'Total votes', value: d.votes.length },
            { label: 'Open requests', value: open }, { label: 'Completed features', value: completed },
          ];
          return (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {stats.map((s) => (
                  <Card key={s.label} className="stat"><p className="text-sm text-slate-500">{s.label}</p><p className="mt-1 text-3xl font-extrabold">{s.value}</p></Card>
                ))}
              </div>
              <Card>
                <div className="mb-2 flex justify-between text-sm"><span className="font-medium">Roadmap progress</span><span>{completed} of {d.roadmap.length} items completed ({progress}%)</span></div>
                <ProgressBar value={completed} max={d.roadmap.length} />
              </Card>
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <h2 className="mb-3 font-semibold">Feedback by category</h2>
                  {d.feedback.length === 0 ? <EmptyState title="No feedback yet" /> : (
                    <div className="h-64"><ResponsiveContainer>
                      <BarChart data={byCategory}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={12} /><YAxis allowDecimals={false} fontSize={12} /><Tooltip />
                        <Bar dataKey="count" name="Feedback" radius={[4, 4, 0, 0]}>{byCategory.map((c) => <Cell key={c.name} fill={c.color} />)}</Bar>
                      </BarChart>
                    </ResponsiveContainer></div>
                  )}
                </Card>
                <Card>
                  <h2 className="mb-3 font-semibold">Roadmap by stage</h2>
                  {byStage.length === 0 ? <EmptyState title="No roadmap items yet" /> : (
                    <div className="h-64"><ResponsiveContainer>
                      <PieChart><Pie data={byStage} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>{byStage.map((s) => <Cell key={s.name} fill={s.color} />)}</Pie><Tooltip /><Legend /></PieChart>
                    </ResponsiveContainer></div>
                  )}
                </Card>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <h2 className="mb-3 font-semibold">Most voted requests</h2>
                  <ul className="divide-y divide-slate-100">
                    {top.map(({ f, v }) => (
                      <li key={f.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <a href={`/w/${workspace.id}/feedback/${f.id}`} className="truncate hover:underline">{f.title}</a>
                        <span className="shrink-0 font-semibold">{v} votes</span>
                      </li>
                    ))}
                    {top.length === 0 && <li className="py-2 text-sm text-slate-500">Nothing to rank yet.</li>}
                  </ul>
                </Card>
                <Card>
                  <h2 className="mb-3 font-semibold">Recent activity</h2>
                  <ul className="space-y-2 text-sm">
                    {[...d.logs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 7).map((l) => (
                      <li key={l.id}><span className="font-medium">{userName(d.users, l.userId)}</span> {l.action} <span className="text-slate-400">· {fmtDate(l.createdAt)}</span></li>
                    ))}
                    {d.logs.length === 0 && <li className="text-slate-500">No activity recorded yet.</li>}
                  </ul>
                </Card>
              </div>
            </div>
          );
        }}
      </QueryBoundary>
    </>
  );
}
