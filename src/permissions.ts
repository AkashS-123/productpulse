import type { Role } from './types';

export const PERMS = {
  manageWorkspace: ['owner'],
  manageSubscription: ['owner'],
  manageMembers: ['owner', 'admin'],
  manageCategories: ['owner', 'admin'],
  editAnyFeedback: ['owner', 'admin'],
  triage: ['owner', 'admin', 'pm'],
  manageRoadmap: ['owner', 'admin', 'pm'],
  manageReleases: ['owner', 'admin', 'pm'],
  viewDashboard: ['owner', 'admin', 'pm'],
} as const satisfies Record<string, readonly Role[]>;

export type Perm = keyof typeof PERMS;
export const hasPerm = (role: Role, perm: Perm): boolean => (PERMS[perm] as readonly Role[]).includes(role);
