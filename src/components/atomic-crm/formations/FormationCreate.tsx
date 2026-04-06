import {
  Form,
  useNotify,
  useRedirect,
} from "ra-core";
import { Create } from "@/components/admin/create";
import { SaveButton } from "@/components/admin/form";
import { FormToolbar } from "@/components/admin/simple-form";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

import { FormationInputs } from "./FormationInputs";

export const FormationCreate = ({ open }: { open: boolean }) => {
  const redirect = useRedirect();
  const notify = useNotify();

  const handleClose = () => {
    redirect("/formations");
  };

  return (
    <Dialog open={open} onOpenChange={() => handleClose()}>
      <DialogContent className="lg:max-w-2xl overflow-y-auto max-h-9/10 top-1/20 translate-y-0">
        <DialogTitle className="text-lg font-semibold">
          Nouvelle formation
        </DialogTitle>
        <Create
          resource="formations"
          mutationOptions={{
            onSuccess: () => {
              notify("Formation créée", { type: "success" });
              redirect("/formations");
            },
          }}
        >
          <Form>
            <FormationInputs />
            <FormToolbar>
              <SaveButton />
            </FormToolbar>
          </Form>
        </Create>
      </DialogContent>
    </Dialog>
  );
};
