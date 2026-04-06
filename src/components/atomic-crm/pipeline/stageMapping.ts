/**
 * Bidirectional mapping between contacts.pipeline_status (French labels)
 * and deals.stage (slugs) so both stay in sync.
 */

import { toSlug } from "@/lib/toSlug";

const LABEL_TO_SLUG: Record<string, string> = {
  "Nouveau lead": "nouveau-lead",
  "Contacté WA": "contacte-wa",
  "À rappeler": "a-rappeler",
  Qualifié: "qualifie",
  "Qualifié AFDAS": "qualifie-afdas",
  Inscrit: "inscrit",
  Converti: "converti",
  Perdu: "perdu",
};

const SLUG_TO_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(LABEL_TO_SLUG).map(([label, slug]) => [slug, label]),
);

/** Convert a pipeline_status label to a deal stage slug */
export const pipelineStatusToStage = (status: string): string | null =>
  LABEL_TO_SLUG[status] ?? toSlug(status) ?? null;

/** Convert a deal stage slug to a pipeline_status label */
export const stageToPipelineStatus = (stage: string): string | null =>
  SLUG_TO_LABEL[stage] ?? null;
