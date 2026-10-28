import { api } from '../api/client';
import { useWorkspace } from '../context/WorkspaceContext';
import { useFetch } from './useFetch';

export type LimitKey = 'members' | 'feedback' | 'roadmap';
const RESOURCE: Record<LimitKey, string> = { members: 'workspaceMembers', feedback: 'feedback', roadmap: 'roadmapItems' };

export function usePlanLimits() {
  const { workspace, plan } = useWorkspace();
  const limit: Record<LimitKey, number> = { members: plan.memberLimit, feedback: plan.feedbackLimit, roadmap: plan.roadmapLimit };
  const q = useFetch(async () => {
    const p = { workspaceId: workspace.id };
    const [m, f, r] = await Promise.all([
      api.list<unknown>(RESOURCE.members, p), api.list<unknown>(RESOURCE.feedback, p), api.list<unknown>(RESOURCE.roadmap, p),
    ]);
    return { members: m.length, feedback: f.length, roadmap: r.length } as Record<LimitKey, number>;
  }, [workspace.id, plan.id]);

  const fresh = async (k: LimitKey) => (await api.list<unknown>(RESOURCE[k], { workspaceId: workspace.id })).length;
  return {
    usage: q.data, limit, reload: q.reload, fresh,
    atLimit: (k: LimitKey) => !!q.data && q.data[k] >= limit[k],
  };
}
