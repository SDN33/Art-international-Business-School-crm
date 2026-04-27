import { useState } from "react";
import {
  useGetList,
  useUpdate,
  useGetOne,
} from "ra-core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Mail, MailOpen, Search, ExternalLink } from "lucide-react";
import { Link } from "react-router";
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

function ContactLink({ contactId }: { contactId: number }) {
  const { data } = useGetOne("contacts", { id: contactId });
  if (!data) return null;
  return (
    <Link
      to={`/contacts/${contactId}/show`}
      className="text-primary underline text-xs flex items-center gap-1"
    >
      {data.first_name} {data.last_name}
      <ExternalLink className="h-3 w-3" />
    </Link>
  );
}

function EmailViewer({
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
            {email.from_name ? `${email.from_name} <${email.from_email}>` : email.from_email}
          </div>
          <div className="text-muted-foreground">
            <span className="font-medium text-foreground">À :</span>{" "}
            {email.to_email ?? "—"}
          </div>
          <div className="text-muted-foreground">
            <span className="font-medium text-foreground">Date :</span>{" "}
            {new Date(email.created_at).toLocaleString("fr-FR")}
          </div>
          {email.contact_id && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">Contact :</span>
              <ContactLink contactId={email.contact_id} />
            </div>
          )}
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

export const EmailInboxList = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [selected, setSelected] = useState<ReceivedEmail | null>(null);
  const [update] = useUpdate();

  const { data: emails, isPending, refetch } = useGetList<ReceivedEmail>(
    "received_emails",
    {
      pagination: { page: 1, perPage: 100 },
      sort: { field: "created_at", order: "DESC" },
      filter: filter === "unread" ? { "is_read@eq": false } : {},
    },
  );

  const filtered = (emails ?? []).filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.from_email.toLowerCase().includes(q) ||
      (e.from_name ?? "").toLowerCase().includes(q) ||
      (e.subject ?? "").toLowerCase().includes(q)
    );
  });

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

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Mail className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Boîte de réception</h1>
          {unreadCount > 0 && (
            <Badge className="bg-primary text-primary-foreground">
              {unreadCount} non lu{unreadCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par expéditeur, objet…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            Tous
          </Button>
          <Button
            variant={filter === "unread" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("unread")}
          >
            Non lus
          </Button>
        </div>
      </div>

      {isPending ? (
        <div className="text-center py-12 text-muted-foreground">
          Chargement…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MailOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Aucun email reçu</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>De</TableHead>
                <TableHead>Objet</TableHead>
                <TableHead className="hidden md:table-cell">Contact</TableHead>
                <TableHead className="hidden sm:table-cell text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((email) => (
                <TableRow
                  key={email.id}
                  className={cn(
                    "cursor-pointer hover:bg-muted/50 transition-colors",
                    !email.is_read && "font-semibold bg-primary/5",
                  )}
                  onClick={() => openEmail(email)}
                >
                  <TableCell>
                    {email.is_read ? (
                      <MailOpen className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Mail className="h-4 w-4 text-primary" />
                    )}
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate">
                    {email.from_name ?? email.from_email}
                  </TableCell>
                  <TableCell className="max-w-[260px] truncate">
                    {email.subject ?? "(Sans objet)"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {email.contact_id ? (
                      <ContactLink contactId={email.contact_id} />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-right text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(email.created_at).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <EmailViewer
        email={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
};
