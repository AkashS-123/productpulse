import { useState } from 'react';
import { api, errMsg, logActivity } from '../api/client';
import { useToast } from '../components/Toast';
import { Badge, Button, Card, LimitBanner, PageHeader, ProgressBar, QueryBoundary } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useFetch } from '../hooks/useFetch';
import { LimitKey, usePlanLimits } from '../hooks/usePlanLimits';
import type { Plan, WorkspaceSubscription } from '../types';

const ROWS: { key: LimitKey; label: string; field: 'memberLimit' | 'feedbackLimit' | 'roadmapLimit' }[] = [
  { key: 'members', label: 'Team members', field: 'memberLimit' },
  { key: 'feedback', label: 'Feedback items', field: 'feedbackLimit' },
  { key: 'roadmap', label: 'Roadmap items', field: 'roadmapLimit' },
];

export default function Subscription() {
  const { workspace, plan, subscription, reload } = useWorkspace();
  const { user } = useAuth();
  const toast = useToast();
  const limits = usePlanLimits();
  const [busy, setBusy] = useState(false);
  const q = useFetch(() => api.list<Plan>('subscriptionPlans'), []);

  async function change(target: Plan) {
    const over = limits.usage && ROWS.filter((r) => limits.usage![r.key] > target[r.field]);
    if (over && over.length) { toast(`Cannot switch to ${target.name}: reduce ${over.map((o) => o.label.toLowerCase()).join(', ')} first.`, 'error'); return; }
    setBusy(true);
    try {
      await api.update<WorkspaceSubscription>('workspaceSubscriptions', subscription.id, { planId: target.id, updatedAt: new Date().toISOString() });
      logActivity(workspace.id, user!.id, `switched the plan to ${target.name}`);
      toast(`Plan changed to ${target.name}`);
      reload();
    } catch (e) { toast(errMsg(e), 'error'); } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="Subscription & usage" subtitle="Billing is simulated in this demo. No payment is taken." />
      {limits.usage && ROWS.map((r) => <LimitBanner key={r.key} label={r.label.toLowerCase()} used={limits.usage![r.key]} limit={limits.limit[r.key]} />)}
      <Card className="mb-6">
        <h2 className="mb-4 font-semibold">Current usage on the {plan.name} plan</h2>
        <div className="space-y-4">
          {ROWS.map((r) => (
            <div key={r.key}>
              <div className="mb-1 flex justify-between text-sm"><span>{r.label}</span><span>{limits.usage ? limits.usage[r.key] : '…'} / {limits.limit[r.key]}</span></div>
              <ProgressBar value={limits.usage?.[r.key] ?? 0} max={limits.limit[r.key]} />
            </div>
          ))}
        </div>
      </Card>
      <QueryBoundary q={q}>
        {(plans) => (
          <div className="grid gap-4 md:grid-cols-2">
            {plans.map((p) => (
              <Card key={p.id} className={p.id === plan.id ? 'border-brand' : ''}>
                <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">{p.name}</h3>{p.id === plan.id && <Badge tone="green">Current plan</Badge>}</div>
                <p className="mt-1 text-2xl font-bold">${p.price}<span className="text-sm font-normal text-slate-500"> / month</span></p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
                <Button className="mt-4 w-full" variant={p.id === plan.id ? 'secondary' : 'primary'} disabled={busy || p.id === plan.id} onClick={() => change(p)}>
                  {p.id === plan.id ? 'Current plan' : p.price > plan.price ? `Upgrade to ${p.name}` : `Switch to ${p.name}`}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </QueryBoundary>
    </>
  );
}
