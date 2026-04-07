import MobileHeader from "../layout/MobileHeader";
import { MobileContent } from "../layout/MobileContent";
import { LeadsListPage } from "./LeadsListPage";
import { Kanban } from "lucide-react";

export const MobileLeadsPage = () => {
  return (
    <>
      <MobileHeader>
        <div className="flex items-center gap-2 text-secondary-foreground">
          <Kanban className="size-5" />
          <h1 className="text-xl font-semibold">Pipeline</h1>
        </div>
      </MobileHeader>
      <MobileContent>
        <div className="overflow-x-auto -mx-4 px-4">
          <LeadsListPage />
        </div>
      </MobileContent>
    </>
  );
};
