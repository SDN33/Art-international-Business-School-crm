import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Inbox, Send, Mail } from "lucide-react";
import { useGetList } from "ra-core";
import { EmailInboxTab } from "./EmailInboxTab";
import { EmailSentTab } from "./EmailSentTab";
import { EmailCampaignsTab } from "./EmailCampaignsTab";

export const EmailPage = () => {
  const [activeTab, setActiveTab] = useState("inbox");

  const { data: unreadEmails } = useGetList("received_emails", {
    filter: { "is_read@eq": false },
    pagination: { page: 1, perPage: 1 },
    sort: { field: "id", order: "DESC" },
  });

  const unreadCount = unreadEmails?.length ?? 0;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background px-4 md:px-6 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <Mail className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Emails</h1>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="border-0 bg-transparent p-0 h-auto">
            <TabsTrigger
              value="inbox"
              className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3 text-sm font-medium"
            >
              <Inbox className="h-4 w-4" />
              Reçus
              {unreadCount > 0 && (
                <Badge className="ml-1 h-5 min-w-5 rounded-full px-1.5 text-xs bg-primary text-primary-foreground">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="sent"
              className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3 text-sm font-medium"
            >
              <Send className="h-4 w-4" />
              Envoyés
            </TabsTrigger>
            <TabsTrigger
              value="campaigns"
              className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3 text-sm font-medium"
            >
              <Mail className="h-4 w-4" />
              Campagnes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inbox" className="mt-0">
            <EmailInboxTab />
          </TabsContent>
          <TabsContent value="sent" className="mt-0">
            <EmailSentTab />
          </TabsContent>
          <TabsContent value="campaigns" className="mt-0">
            <EmailCampaignsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
