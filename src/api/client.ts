import axios from 'axios';
import type { ActivityLog, Feedback, Vote } from '../types';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3001',
  timeout: 8000,
});
type Params = Record<string, string | number | boolean | undefined>;

export const api = {
  async list<T>(resource: string, params: Params = {}): Promise<T[]> {
    return (await http.get<T[]>(`/${resource}`, { params })).data;
  },
  async get<T>(resource: string, id: number | string): Promise<T> {
    return (await http.get<T>(`/${resource}/${id}`)).data;
  },
  async create<T>(resource: string, body: Partial<T>): Promise<T> {
    return (await http.post<T>(`/${resource}`, body)).data;
  },
  async update<T>(resource: string, id: number | string, body: Partial<T>): Promise<T> {
    return (await http.patch<T>(`/${resource}/${id}`, body)).data;
  },
  async remove(resource: string, id: number | string): Promise<void> {
    await http.delete(`/${resource}/${id}`);
  },
};

export function errMsg(e: unknown): string {
  if (axios.isAxiosError(e)) {
    if (!e.response) return 'Cannot reach the API. Start JSON Server with "npm run api" (port 3001).';
    return `Request failed (${e.response.status}). Try again.`;
  }
  return e instanceof Error ? e.message : 'Something went wrong. Try again.';
}

export function logActivity(workspaceId: number, userId: number, action: string) {
  api.create<ActivityLog>('activityLogs', { workspaceId, userId, action, createdAt: new Date().toISOString() })
    .catch(() => undefined);
}

/** One vote per user per feedback item. Returns true when the vote is now on. */
export async function toggleVote(workspaceId: number, feedbackId: number, userId: number): Promise<boolean> {
  const existing = await api.list<Vote>('votes', { feedbackId, userId });
  if (existing.length) {
    await Promise.all(existing.map((v) => api.remove('votes', v.id)));
    return false;
  }
  await api.create<Vote>('votes', { workspaceId, feedbackId, userId });
  return true;
}

async function removeAll(resource: string, params: Params) {
  const rows = await api.list<{ id: number }>(resource, params);
  await Promise.all(rows.map((r) => api.remove(resource, r.id)));
}

export async function deleteFeedbackCascade(id: number) {
  await removeAll('votes', { feedbackId: id });
  await removeAll('comments', { feedbackId: id });
  const dups = await api.list<Feedback>('feedback', { duplicateOfId: id });
  await Promise.all(dups.map((d) => api.update<Feedback>('feedback', d.id, { duplicateOfId: null })));
  await api.remove('feedback', id);
}

export async function deleteWorkspaceCascade(id: number) {
  const resources = ['votes', 'comments', 'feedback', 'roadmapItems', 'releaseNotes', 'categories', 'tags',
    'workspaceMembers', 'workspaceSubscriptions', 'activityLogs'];
  for (const r of resources) await removeAll(r, { workspaceId: id });
  await api.remove('workspaces', id);
}
