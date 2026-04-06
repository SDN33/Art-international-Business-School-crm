import type { DataProvider } from "ra-core";
import { pipelineStatusToStage, stageToPipelineStatus } from "./stageMapping";

/**
 * After updating a contact's pipeline_status (French label),
 * sync all linked deals' stage (slug) to match.
 */
export const syncDealsStageFromContact = async (
  contactId: number,
  newStatus: string,
  dataProvider: DataProvider,
) => {
  const slug = pipelineStatusToStage(newStatus);
  if (!slug) return;
  try {
    const { data: deals } = await dataProvider.getList("deals", {
      pagination: { page: 1, perPage: 50 },
      sort: { field: "id", order: "ASC" },
      filter: { "contact_ids@cs": `{${contactId}}` },
    });
    await Promise.all(
      deals
        .filter((d: { stage: string }) => d.stage !== slug)
        .map((d: { id: number; stage: string }) =>
          dataProvider.update("deals", {
            id: d.id,
            data: { stage: slug },
            previousData: d,
          }),
        ),
    );
  } catch {
    // Non-critical: deal sync failure should not block contact update
  }
};

/**
 * After a deal moves to a new stage (slug),
 * sync all linked contacts' pipeline_status (French label) to match.
 */
export const syncContactsFromDealStage = async (
  deal: { contact_ids?: number[] },
  newStage: string,
  dataProvider: DataProvider,
) => {
  const label = stageToPipelineStatus(newStage);
  if (!label || !deal.contact_ids?.length) return;
  try {
    await Promise.all(
      deal.contact_ids.map((contactId) =>
        dataProvider.update("contacts", {
          id: contactId,
          data: { pipeline_status: label },
          previousData: { id: contactId },
        }),
      ),
    );
  } catch {
    // Non-critical: contact sync failure should not block deal update
  }
};
