import {
  EditBase,
  Form,
  useNotify,
  useRedirect,
  useRecordContext,
} from "ra-core";
import { SaveButton } from "@/components/admin/form";
import { FormToolbar } from "@/components/admin/simple-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

import { FormationInputs } from "./FormationInputs";

export const FormationEdit = ({
  open,
  id,
}: {
  open: boolean;
  id?: string;
}) => {
  const redirect = useRedirect();
  const notify = useNotify();

  const handleClose = () => {
    redirect("/formations");
  };

  return (
    <Dialog open={open} onOpenChange={() => handleClose()}>
      <DialogContent className="lg:max-w-2xl overflow-y-auto max-h-9/10 top-1/20 translate-y-0">
        {id ? (
          <EditBase
            id={id}
            mutationMode="pessimistic"
            mutationOptions={{
              onSuccess: () => {
                notify("Formation mise à jour", { type: "success" });
                redirect("/formations");
              },
            }}
          >
            <EditHeader />
            <Form>
              <FormationInputs />
              <FormToolbar>
                <div className="flex justify-between w-full">
                  <DeleteButton
                    mutationOptions={{
                      onSuccess: () => {
                        notify("Formation supprimée", { type: "success" });
                        redirect("/formations");
                      },
                    }}
                  />
                  <SaveButton />
                </div>
              </FormToolbar>
            </Form>
          </EditBase>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

const EditHeader = () => {
  const record = useRecordContext();
  if (!record) return null;
  return (
    <DialogTitle className="text-lg font-semibold">
      Modifier : {record.nom}
    </DialogTitle>
  );
};
