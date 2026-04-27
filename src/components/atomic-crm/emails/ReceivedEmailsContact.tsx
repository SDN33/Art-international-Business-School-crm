import { useState } from "react";
import { useGetList, useUpdate } from "ra-core";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Mail, MailOpen, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

type ReceivedEmail = {
  id: number;
  created_at: string;
  from_email: string;
  from_name: string | null;
  to_email: string | null;
  subject: string | null;
  text_body: string | null;
  html_body: string | null;
  contact_id: number | null;
  is_read: boolean;
};

function EmailDetailSheet({
  email,
  open,
  onClose,
}: {
  email: ReceivedEmail | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!email) return null;
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base font-semibold pr-6">
            {email.subject ?? "(Sans objet)"}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3 text-sm">
          <div className="text-muted-foreground">
            <span className="font-medium text-foreground">De :</span>{" "}
            {email.from_name
              ? `${email.from_name} <${email.from_email}>`
              : email.from_email}
          </div>
          <div className="text-muted-foreground">
            <span className="font-medium text-foreground">Date :</span>{" "}
            {new Date(email.created_at).toLocaleString("fr-FR")}
          </div>
          <div className="border-t pt-4">
            {email.html_body ? (
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: email.html_body }}
              />
            ) : (
              <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
                {email.text_body ?? "(Corps vide)"}
              </pre>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export const ReceivedEmailsContact = ({
  contactId,
}: {
  contactId: number | string;
}) => {
  const [selected, setSelected] = useState<ReceivedEmail | null>(null);
  const [update] = useUpdate();

  const { data: emails, isPending, refetch } = useGetList<ReceivedEmail>(
    "received_emails",
    {
      pagination: { page: 1, perPage: 50 },
      sort: { field: "created_at", order: "DESC" },
      filter: { "contact_id@eq": contactId },
    },
  );

  const unreadCount = (emails ?? []).filter((e) => !e.is_read).length;

  const openEmail = async (email: ReceivedEmail) => {
    setSelected(email);
    if (!email.is_read) {
      await update("received_emails", {
        id: email.id,
        data: { is_read: true },
        previousData: email,
      });
      refetch();
    }
  };

  if (isPending) return null;

  if (!emails || emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
        <Inbox className="h-8 w-8 mb-2 opacity-30" />
        <p className="text-sm">Aucun email reçu de ce contact</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-3">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Emails reçus</span>
        {unreadCount > 0 && (
          <Badge className="h-5 text-xs bg-primary text-primary-foreground">
            {unreadCount}
          </Badge>
        )}
      </div>

      {emails.map((email) => (
        <div
          key={email.id}
          className={cn(
            "flex items-start gap-3 rounded-md px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors border",
            !email.is_read && "bg-primary/5 border-primary/20 font-medium",
          )}
          onClick={() => openEmail(email)}
        >
          <div className="pt-0.5 flex-shrink-0">
            {email.is_read ? (
              <MailOpen className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Mail className="h-4 w-4 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">
              {email.subject ?? "(Sans objet)"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {email.text_body?.slice(0, 80) ?? ""}
            </p>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
            {new Date(email.created_at).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "short",
            })}
          </span>
        </div>
      ))}

      <EmailDetailSheet
        email={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
};
