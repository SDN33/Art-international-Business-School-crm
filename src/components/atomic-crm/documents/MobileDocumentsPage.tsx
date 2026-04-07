import MobileHeader from "../layout/MobileHeader";
import { MobileContent } from "../layout/MobileContent";
import { DocumentList } from "./DocumentList";
import { FileText } from "lucide-react";

export const MobileDocumentsPage = () => {
  return (
    <>
      <MobileHeader>
        <div className="flex items-center gap-2 text-secondary-foreground">
          <FileText className="size-5" />
          <h1 className="text-xl font-semibold">Documents</h1>
        </div>
      </MobileHeader>
      <MobileContent>
        <div className="overflow-x-auto -mx-4 px-4">
          <DocumentList />
        </div>
      </MobileContent>
    </>
  );
};
