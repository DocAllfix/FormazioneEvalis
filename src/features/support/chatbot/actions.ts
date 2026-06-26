"use server";

// Server Action staff: ricostruisce il knowledge base del chatbot (FAQ + corsi).

import { requirePlatformAdmin } from "@/features/auth/guards";
import { reindexKnowledge } from "./ingest";

export async function reindexKnowledgeAction() {
  await requirePlatformAdmin();
  return reindexKnowledge();
}
