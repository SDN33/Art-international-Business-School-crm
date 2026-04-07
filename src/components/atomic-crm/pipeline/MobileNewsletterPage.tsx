import MobileHeader from "../layout/MobileHeader";
import { MobileContent } from "../layout/MobileContent";
import { NewsletterList } from "./NewsletterList";
import { Mail } from "lucide-react";

export const MobileNewsletterPage = () => {
  return (
    <>
      <MobileHeader>
        <div className="flex items-center gap-2 text-secondary-foreground">
          <Mail className="size-5" />
          <h1 className="text-xl font-semibold">Newsletter</h1>
        </div>
      </MobileHeader>
      <MobileContent>
        <div className="overflow-x-auto -mx-4 px-4">
          <NewsletterList />
        </div>
      </MobileContent>
    </>
  );
};
