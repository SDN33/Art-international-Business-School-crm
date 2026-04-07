import MobileHeader from "../layout/MobileHeader";
import { MobileContent } from "../layout/MobileContent";
import { InteractionList } from "./InteractionList";
import { MessageSquare } from "lucide-react";

export const MobileInteractionsPage = () => {
  return (
    <>
      <MobileHeader>
        <div className="flex items-center gap-2 text-secondary-foreground">
          <MessageSquare className="size-5" />
          <h1 className="text-xl font-semibold">Interactions</h1>
        </div>
      </MobileHeader>
      <MobileContent>
        <div className="overflow-x-auto -mx-4 px-4">
          <InteractionList />
        </div>
      </MobileContent>
    </>
  );
};
