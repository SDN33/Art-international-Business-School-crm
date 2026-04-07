import MobileHeader from "../layout/MobileHeader";
import { MobileContent } from "../layout/MobileContent";
import { PaiementList } from "./PaiementList";
import { CreditCard } from "lucide-react";

export const MobilePaiementsPage = () => {
  return (
    <>
      <MobileHeader>
        <div className="flex items-center gap-2 text-secondary-foreground">
          <CreditCard className="size-5" />
          <h1 className="text-xl font-semibold">Paiements</h1>
        </div>
      </MobileHeader>
      <MobileContent>
        <div className="overflow-x-auto -mx-4 px-4">
          <PaiementList />
        </div>
      </MobileContent>
    </>
  );
};
