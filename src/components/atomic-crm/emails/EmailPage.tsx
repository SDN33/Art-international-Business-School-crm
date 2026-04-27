import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Inbox, Send, Mail } from "lucide-react";
import { useGetList } from "ra-core";
import { EmailInboxTab } from "./EmailInboxTab";
import { EmailSentTab } from "./EmailSentTab";
import { EmailCampaignsTab } from "./EmailCampaignsTab";

const TAB_TRIGGER =
  "flex items-center gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 pb-2.5 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground transition-colors";

export const EmailPage = () => {
  const [activeTab, setActiveTab] = useState("inbox");

  const { data: unreadEmails } = useGetList("received_emails", {
    filter: { "is_read@eq": false },
    pagination: { page: 1, perPage: 100 },
    sort: { field: "id", order: "DESC" },
  });

  const unreadCount = unreadEmails?.length ?? 0;

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="flex flex-col h-full"
    >
      {/* ─── Header fixe ─────────────────────────────────── */}
      <div className="shrink-0 border-b bg-background px-4 md:px-6 pt-4 pb-0">
        <div className="flex items-center gap-2 mb-3">
          <Mail className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Emails</h1>
        </div>
        <TabsList className="border-0 bg-transparent p-0 h-auto gap-1">
          <TabsTrigger value="inbox" className={TAB_TRIGGER}>
            <Inbox className="h-4 w-4" />
            Reçus
            {unreadCount > 0 && (
              <Badge className="ml-0.5 h-4.5 min-w-4.5 rounded-full px-1 text-[10px] leading-none bg-primary text-primary-foreground">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className={TAB_TRIGGER}>
            <Send className="h-4 w-4" />
            Envoyés
          </TabsTrigger>
          <TabsTrigger value="campaigns" className={TAB_TRIGGER}>
            <Mail className="h-4 w-4" />
            Campagnes
          </TabsTrigger>
        </TabsList>
      </div>

      {/* ─── Contenu scrollable ───────────────────────────── */}
      <TabsContent value="inbox" className="flex-1 overflow-auto mt-0 data-[state=inactive]:hidden">
        <EmailInboxTab />
      </TabsContent>
      <TabsContent value="sent" className="flex-1 overflow-auto mt-0 data-[state=inactive]:hidden">
        <EmailSentTab />
      </TabsContent>
      <TabsContent value="campaigns" className="flex-1 overflow-auto mt-0 data-[state=inactive]:hidden">
        <EmailCampaignsTab />
      </TabsContent>
    </Tabs>
  );
};
