"use server";

// Server Actions forum. Applicano i guard e l'autorizzazione (sessione per i discenti,
// requirePlatformAdmin per la moderazione), poi delegano al lifecycle.

import { requireSession, requireActiveOrg, requirePlatformAdmin } from "@/features/auth/guards";
import {
  createThread,
  replyToThread,
  editOwnPost,
  deleteOwnPost,
  reportPost,
  setPostHidden,
  deletePostByStaff,
  setThreadLocked,
  resolveReport,
} from "@/features/community/lifecycle";

// --- Discente ---

export async function createThreadAction(categoryId: string, title: string, body: string) {
  const { user, orgId } = await requireActiveOrg();
  return createThread({ authorId: user.id, orgId, categoryId, title, body });
}

export async function replyThreadAction(threadId: string, body: string) {
  const { user, orgId } = await requireActiveOrg();
  return replyToThread({ authorId: user.id, orgId, threadId, body });
}

export async function editPostAction(postId: string, body: string) {
  const { user } = await requireSession();
  return editOwnPost({ postId, authorId: user.id, body });
}

export async function deletePostAction(postId: string) {
  const { user } = await requireSession();
  return deleteOwnPost({ postId, authorId: user.id });
}

export async function reportPostAction(postId: string, reason: string) {
  const { user } = await requireSession();
  return reportPost({ postId, reporterId: user.id, reason });
}

// --- Moderazione staff ---

export async function staffSetPostHiddenAction(postId: string, hidden: boolean) {
  const ctx = await requirePlatformAdmin();
  return setPostHidden({ postId, hidden, staffId: ctx.user.id });
}

export async function staffDeletePostAction(postId: string) {
  const ctx = await requirePlatformAdmin();
  return deletePostByStaff({ postId, staffId: ctx.user.id });
}

export async function staffSetThreadLockedAction(threadId: string, locked: boolean) {
  const ctx = await requirePlatformAdmin();
  return setThreadLocked({ threadId, locked, staffId: ctx.user.id });
}

export async function staffResolveReportAction(reportId: string) {
  const ctx = await requirePlatformAdmin();
  return resolveReport({ reportId, staffId: ctx.user.id });
}
