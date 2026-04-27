import { useState } from "react";
import { useGetList, useGetOne } from "ra-core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Send, Search, ExternalLink, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";

type EmailLog = {
  id: number;
  created_at: string;
  to_email: string;
  subject: string | null;
  status: string;
  resend_id: string | null;
  contact_id: number | null;
  campaign_id: number | null;
  sales_id: number | null;
  html_body: string | null;
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; class: string }> = {
  sent: {
    label: "Envoyé",
    icon: <CheckCircle className="h-4 w-4 text-green-500" />,
    class: "bg-green-50 text-green-700",
  },
  failed: {
    label: "Échec",
    icon: <XCircle className="h-4 w-4 text-red-500" />,
    class: "bg-red-50 text-red-700",
  },
  pending: {
    label: "En attente",
    icon: <Clock className="h-4 w-4 text-yellow-500" />,
    class: "bg-yellow-50 text-yellow-700",
  },
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

function EmailDetailSheet({
  email,
  open,
  onClose,
}: {
  email: EmailLog | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!email) return null;
  const status = STATUS_CONFIG[email.status] ?? STATUS_CONFIG.pending;
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
            <span className="font-medium text-foreground">À :</span>{" "}
            {email.to_email}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">Statut :</span>
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", status.class)}>
              {status.label}
            </span>
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
          {email.resend_id && (
            <div className="text-muted-foreground text-xs">
              ID Resend : {email.resend_id}
            </div>
          )}
          {email.html_body && (
            <div className="border-t pt-4">
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: email.html_body }}
              />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export const EmailSentTab = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "sent" | "failed">("all");
  const [selected, setSelected] = useState<EmailLog | null>(null);

  const { data: logs, isPending, refetch } = useGetList<EmailLog>("email_logs", {
    pagination: { page: 1, perPage: 200 },
    sort: { field: "created_at", order: "DESC" },
    filter: statusFilter !== "all" ? { "status@eq": statusFilter } : {},
  });

  const filtered = (logs ?? []).filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.to_email.toLowerCase().includes(q) ||
      (e.subject ?? "").toLowerCase().includes(q)
    );
  });

  const counts = {
    all: logs?.length ?? 0,
    sent: (logs ?? []).filter((e) => e.status === "sent").length,
    failed: (logs ?? []).filter((e) => e.status === "failed").length,
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher destinataire, objet…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
          >
            Tous
            <span className="ml-1 text-xs opacity-70">{counts.all}</span>
          </Button>
          <Button
            variant={statusFilter === "sent" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("sent")}
          >
            <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
            Envoyés
            <span className="ml-1 text-xs opacity-70">{counts.sent}</span>
          </Button>
          {counts.failed > 0 && (
            <Button
              variant={statusFilter === "failed" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("failed")}
            >
              <XCircle className="h-3 w-3 mr-1 text-red-500" />
              Échecs
              <span className="ml-1 text-xs opacity-70">{counts.failed}</span>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => refetch()} title="Actualiser">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isPending ? (
        <div className="text-center py-12 text-muted-foreground">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Send className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Aucun email envoyé</p>
        </div>
      ) : (
        <div className="divide-y border rounded-lg overflow-hidden">
          {filtered.map((log) => {
            const statusCfg = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.pending;
            return (
              <button
                key={log.id}
                onClick={() => setSelected(log)}
                className="w-full text-left flex items-start gap-3 p-3 sm:p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="mt-0.5 shrink-0">{statusCfg.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{log.to_email}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(log.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground truncate">
                      {log.subject ?? "(Sans objet)"}
                    </span>
                    {log.campaign_id && (
                      <Badge variant="outline" className="text-xs shrink-0 h-4 px-1">
                        Campagne
                      </Badge>
                    )}
                    {log.contact_id && (
                      <Badge variant="outline" className="text-xs shrink-0 h-4 px-1">
                        Contact lié
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <EmailDetailSheet
        email={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
};
