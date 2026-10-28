export type Role = 'owner' | 'admin' | 'pm' | 'customer';
export type MemberStatus = 'active' | 'invited' | 'suspended';
export type FeedbackStatus = 'open' | 'under_review' | 'planned' | 'in_progress' | 'completed' | 'closed';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Stage = 'under_review' | 'planned' | 'in_progress' | 'completed';
export type NoteStatus = 'draft' | 'published' | 'archived';

export interface User { id: number; name: string; email: string; password: string }
export interface Workspace {
  id: number; name: string; slug: string; description: string; logoUrl: string;
  brandColor: string; publicRoadmap: boolean; ownerId: number; createdAt: string;
}
export interface Member { id: number; workspaceId: number; userId: number; role: Role; status: MemberStatus }
export interface Category { id: number; workspaceId: number; name: string; color: string }
export interface Tag { id: number; workspaceId: number; name: string }
export interface Feedback {
  id: number; workspaceId: number; title: string; description: string; categoryId: number;
  submitterId: number; tagIds: number[]; priority: Priority; status: FeedbackStatus;
  createdAt: string; duplicateOfId: number | null;
}
export interface Vote { id: number; workspaceId: number; feedbackId: number; userId: number }
export interface Comment { id: number; workspaceId: number; feedbackId: number; userId: number; body: string; createdAt: string }
export interface RoadmapItem {
  id: number; workspaceId: number; title: string; description: string; stage: Stage;
  published: boolean; feedbackIds: number[]; createdAt: string;
}
export interface ReleaseNote {
  id: number; workspaceId: number; version: string; releaseDate: string; summary: string;
  status: NoteStatus; roadmapItemIds: number[];
}
export interface Plan {
  id: string; name: string; price: number; memberLimit: number; feedbackLimit: number;
  roadmapLimit: number; features: string[];
}
export interface WorkspaceSubscription { id: number; workspaceId: number; planId: string; updatedAt: string }
export interface ActivityLog { id: number; workspaceId: number; userId: number; action: string; createdAt: string }
