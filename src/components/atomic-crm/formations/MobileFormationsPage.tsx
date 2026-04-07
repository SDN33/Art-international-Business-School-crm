import MobileHeader from "../layout/MobileHeader";
import { MobileContent } from "../layout/MobileContent";
import FormationList from "./FormationList";
import { GraduationCap } from "lucide-react";

export const MobileFormationsPage = () => {
  return (
    <>
      <MobileHeader>
        <div className="flex items-center gap-2 text-secondary-foreground">
          <GraduationCap className="size-5" />
          <h1 className="text-xl font-semibold">Formations</h1>
        </div>
      </MobileHeader>
      <div
        className="max-w-7xl mx-auto px-2"
        style={{
          paddingTop: "calc(3.5rem + env(safe-area-inset-top) + 1rem)",
          paddingBottom: "calc(5rem + env(safe-area-inset-bottom))",
        }}
      >
        <FormationList />
      </div>
    </>
  );
};
