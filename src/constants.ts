import type { FeedbackStatus, MemberStatus, NoteStatus, Priority, Role, Stage } from './types';

export const TONES = {
  gray: 'bg-slate-100 text-slate-700',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  purple: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
} as const;
export type Tone = keyof typeof TONES;

export const STATUS_LABEL: Record<FeedbackStatus, string> = {
  open: 'Open', under_review: 'Under review', planned: 'Planned',
  in_progress: 'In progress', completed: 'Completed', closed: 'Closed',
};
export const STATUS_TONE: Record<FeedbackStatus, Tone> = {
  open: 'gray', under_review: 'amber', planned: 'blue', in_progress: 'purple', completed: 'green', closed: 'red',
};
export const CLOSED_STATUSES: FeedbackStatus[] = ['completed', 'closed'];

export const PRIORITY_LABEL: Record<Priority, string> = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };
export const PRIORITY_TONE: Record<Priority, Tone> = { low: 'gray', medium: 'blue', high: 'amber', critical: 'red' };

export const STAGES: { key: Stage; label: string; tone: Tone; color: string }[] = [
  { key: 'under_review', label: 'Under review', tone: 'amber', color: '#d97706' },
  { key: 'planned', label: 'Planned', tone: 'blue', color: '#2563eb' },
  { key: 'in_progress', label: 'In progress', tone: 'purple', color: '#7c3aed' },
  { key: 'completed', label: 'Completed', tone: 'green', color: '#059669' },
];
export const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.key, s.label])) as Record<Stage, string>;
export const STAGE_TO_STATUS: Record<Stage, FeedbackStatus> = {
  under_review: 'under_review', planned: 'planned', in_progress: 'in_progress', completed: 'completed',
};

export const ROLE_LABEL: Record<Role, string> = { owner: 'Workspace owner', admin: 'Admin', pm: 'Product manager', customer: 'Customer' };
export const MEMBER_STATUS_TONE: Record<MemberStatus, Tone> = { active: 'green', invited: 'amber', suspended: 'red' };
export const NOTE_STATUS_TONE: Record<NoteStatus, Tone> = { draft: 'amber', published: 'green', archived: 'gray' };
export const DEMO_PASSWORD = 'password123';
