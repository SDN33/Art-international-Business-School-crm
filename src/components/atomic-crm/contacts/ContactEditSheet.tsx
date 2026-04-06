import type { Identifier } from "ra-core";
import { useDataProvider } from "ra-core";
import { EditSheet } from "../misc/EditSheet";
import { ContactInputs } from "./ContactInputs";
import {
  cleanupContactForEdit,
  defaultEmailJsonb,
  defaultPhoneJsonb,
} from "./contactModel";
import { syncDealsStageFromContact } from "../pipeline/syncPipelineStatus";

export interface ContactEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: Identifier;
}

export const ContactEditSheet = ({
  open,
  onOpenChange,
  contactId,
}: ContactEditSheetProps) => {
  const dataProvider = useDataProvider();

  return (
    <EditSheet
      resource="contacts"
      id={contactId}
      open={open}
      onOpenChange={onOpenChange}
      transform={cleanupContactForEdit}
      defaultValues={{
        email_jsonb: defaultEmailJsonb,
        phone_jsonb: defaultPhoneJsonb,
      }}
      mutationOptions={{
        onSettled: (data: any, error: any) => {
          if (!error && data?.pipeline_status) {
            syncDealsStageFromContact(data.id, data.pipeline_status, dataProvider);
          }
        },
      }}
    >
      <ContactInputs />
    </EditSheet>
  );
};
