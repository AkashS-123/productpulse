import { createContext, ReactNode, useContext } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { ErrorState, Spinner } from '../components/ui';
import { useFetch } from '../hooks/useFetch';
import { hasPerm, Perm } from '../permissions';
import type { Member, Plan, Role, Workspace, WorkspaceSubscription } from '../types';
import { useAuth } from './AuthContext';

interface WsCtx {
  workspace: Workspace; member: Member; role: Role; plan: Plan; subscription: WorkspaceSubscription;
  can: (p: Perm) => boolean; reload: () => void;
}
const Ctx = createContext<WsCtx | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { workspaceId } = useParams();
  const id = Number(workspaceId);
  const { user } = useAuth();

  const q = useFetch(async () => {
    const [workspace, members, subs, plans] = await Promise.all([
      api.get<Workspace>('workspaces', id),
      api.list<Member>('workspaceMembers', { workspaceId: id, userId: user!.id }),
      api.list<WorkspaceSubscription>('workspaceSubscriptions', { workspaceId: id }),
      api.list<Plan>('subscriptionPlans'),
    ]);
    const subscription = subs[0];
    const plan = plans.find((p) => p.id === subscription?.planId) ?? plans[0];
    return { workspace, member: members[0], subscription, plan };
  }, [id, user?.id]);

  if (q.error && !q.data) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <ErrorState message="This workspace could not be loaded. It may have been deleted." onRetry={q.reload} />
        <Link to="/workspaces" className="mt-4 block text-center text-sm underline">Back to workspaces</Link>
      </div>
    );
  }
  if (!q.data) return <Spinner />;
  const { workspace, member, subscription, plan } = q.data;
  if (!member || member.status === 'suspended') return <Navigate to="/workspaces" replace />;

  const value: WsCtx = { workspace, member, role: member.role, plan, subscription, can: (p) => hasPerm(member.role, p), reload: q.reload };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkspace() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return c;
}

export function RequirePerm({ perm, children }: { perm: Perm; children: ReactNode }) {
  const { can, workspace } = useWorkspace();
  return can(perm) ? <>{children}</> : <Navigate to={`/w/${workspace.id}/feedback`} replace />;
}
