import type { User } from './types';

export const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
export const userName = (users: User[], id: number) => users.find((u) => u.id === id)?.name ?? 'Unknown user';
export const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export const isHexColor = (s: string) => /^#[0-9a-fA-F]{6}$/.test(s);
export const isUrl = (s: string) => { try { return ['http:', 'https:'].includes(new URL(s).protocol); } catch { return false; } };
