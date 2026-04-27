import { useState } from "react";
import {
  useGetList,
  useCreate,
  useDelete,
  useNotify,
  useRefresh,
  useDataProvider,
  useGetOne,
} from "ra-core";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Mail,
  Plus,
  Trash2,
  Send,
  Users,
  Eye,
  ChevronLeft,
} from "lucide-react";
import type { CrmDataProvider } from "../providers/types";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sending: "bg-yellow-100 text-yellow-700",
  sent: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};
const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  sending: "Envoi en cours…",
  sent: "Envoyée",
  failed: "Erreur",
};

type Campaign = {
  id: number;
  name: string;
  subject: string;
  html_body: string;
  status: string;
  sent_at: string | null;
  total_sent: number;
  total_error: number;
  created_at: string;
};

type Contact = {
  id: string;
  first_name: string;
  last_name: string;
  email_jsonb: { email: string; type: string }[];
};

const emptyForm = { name: "", subject: "", html_body: "" };

export const EmailCampaignList = () => {
  const notify = useNotify();
  const refresh = useRefresh();
  const dataProvider = useDataProvider<CrmDataProvider>();
  const [create] = useCreate();
  const [deleteCampaign] = useDelete();

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [recipientsOpen, setRecipientsOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const { data: campaigns = [], isLoading } = useGetList<Campaign>(
    "email_campaigns",
    {
      pagination: { page: 1, perPage: 100 },
      sort: { field: "created_at", order: "DESC" },
    },
  );

  const handleCreate = async () => {
    if (!form.name || !form.subject || !form.html_body) return;
    try {
      await create(
        "email_campaigns",
        { data: { ...form, status: "draft" } },
        { returnPromise: true },
      );
      notify("Campagne créée", { type: "success" });
      setCreateOpen(false);
      setForm(emptyForm);
      refresh();
    } catch {
      notify("Erreur lors de la création", { type: "error" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cette campagne ?")) return;
    try {
      await deleteCampaign("email_campaigns", { id }, { returnPromise: true });
      refresh();
    } catch {
      notify("Erreur lors de la suppression", { type: "error" });
    }
  };

  const handleSend = async (campaign: Campaign) => {
    if (
      !confirm(
        `Envoyer la campagne "${campaign.name}" à tous les destinataires ?`,
      )
    )
      return;
    setSending(true);
    try {
      const result = await dataProvider.sendCampaign(campaign.id);
      notify(
        `Campagne envoyée : ${result.total_sent} OK, ${result.total_error} erreurs`,
        { type: result.total_error > 0 ? "warning" : "success" },
      );
      refresh();
    } catch {
      notify("Erreur lors de l'envoi", { type: "error" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="h-6 w-6" />
          Campagnes email
        </h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle campagne
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          Aucune campagne. Créez-en une pour démarrer.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Objet</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Envoyés</TableHead>
              <TableHead>Date</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.subject}</TableCell>
                <TableCell>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[c.status] ?? ""}`}
                  >
                    {STATUS_LABELS[c.status] ?? c.status}
                  </span>
                </TableCell>
                <TableCell>
                  {c.status === "sent"
                    ? `${c.total_sent} / ${c.total_sent + c.total_error}`
                    : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {c.sent_at
                    ? new Date(c.sent_at).toLocaleDateString("fr-FR")
                    : new Date(c.created_at).toLocaleDateString("fr-FR")}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Gérer les destinataires"
                      onClick={() => {
                        setSelectedCampaign(c);
                        setRecipientsOpen(true);
                      }}
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                    {c.status === "draft" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Envoyer"
                        disabled={sending}
                        onClick={() => handleSend(c)}
                      >
                        <Send className="h-4 w-4 text-primary" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Supprimer"
                      onClick={() => handleDelete(c.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle campagne email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Nom de la campagne</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Relance inscriptions octobre"
              />
            </div>
            <div className="space-y-1">
              <Label>Objet de l'email</Label>
              <Input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Objet visible par le destinataire"
              />
            </div>
            <div className="space-y-1">
              <Label>Corps de l'email (HTML ou texte)</Label>
              <Textarea
                value={form.html_body}
                onChange={(e) =>
                  setForm({ ...form, html_body: e.target.value })
                }
                placeholder={`Bonjour {{prenom}},\n\nNous vous informons...`}
                rows={10}
                className="resize-none font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Utilisez <code>{"{{prenom}}"}</code> pour personnaliser.
                Expéditeur : <strong>noreply@artaibs.fr</strong>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!form.name || !form.subject || !form.html_body}
            >
              Créer le brouillon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recipients sheet */}
      {selectedCampaign && (
        <RecipientsSheet
          campaign={selectedCampaign}
          open={recipientsOpen}
          onOpenChange={(v) => {
            setRecipientsOpen(v);
            if (!v) setSelectedCampaign(null);
          }}
        />
      )}
    </div>
  );
};

const RecipientsSheet = ({
  campaign,
  open,
  onOpenChange,
}: {
  campaign: Campaign;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) => {
  const notify = useNotify();
  const refresh = useRefresh();
  const [create] = useCreate();
  const [deleteFn] = useDelete();
  const [contactSearch, setContactSearch] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(
    new Set(),
  );

  const { data: currentRecipients = [], refetch } = useGetList(
    "email_campaign_contacts",
    {
      filter: { "campaign_id@eq": campaign.id },
      pagination: { page: 1, perPage: 1000 },
      sort: { field: "id", order: "ASC" },
    },
  );

  const { data: contacts = [] } = useGetList<Contact>("contacts", {
    filter: contactSearch ? { "first_name@ilike": `%${contactSearch}%` } : {},
    pagination: { page: 1, perPage: 50 },
    sort: { field: "last_name", order: "ASC" },
  });

  const handleAddSelected = async () => {
    const existingContactIds = new Set(
      currentRecipients.map((r: any) => r.contact_id),
    );
    const toAdd = contacts.filter(
      (c) =>
        selectedContactIds.has(c.id) &&
        !existingContactIds.has(c.id) &&
        c.email_jsonb?.[0]?.email,
    );
    if (toAdd.length === 0) {
      notify("Aucun nouveau destinataire à ajouter", { type: "info" });
      return;
    }
    try {
      await Promise.all(
        toAdd.map((c) =>
          create(
            "email_campaign_contacts",
            {
              data: {
                campaign_id: campaign.id,
                contact_id: c.id,
                email: c.email_jsonb[0].email,
                first_name: c.first_name,
                status: "pending",
              },
            },
            { returnPromise: true },
          ),
        ),
      );
      notify(`${toAdd.length} destinataire(s) ajouté(s)`, { type: "success" });
      setSelectedContactIds(new Set());
      refetch();
      refresh();
    } catch {
      notify("Erreur lors de l'ajout", { type: "error" });
    }
  };

  const handleRemove = async (id: number) => {
    try {
      await deleteFn(
        "email_campaign_contacts",
        { id },
        { returnPromise: true },
      );
      refetch();
      refresh();
    } catch {
      notify("Erreur lors de la suppression", { type: "error" });
    }
  };

  const toggleContact = (id: string) => {
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Destinataires — {campaign.name}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-6">
          {/* Current recipients */}
          <div>
            <h3 className="text-sm font-semibold mb-2">
              Destinataires actuels ({currentRecipients.length})
            </h3>
            {currentRecipients.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Aucun destinataire pour le moment.
              </p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto border rounded-md p-2">
                {currentRecipients.map((r: any) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between text-sm py-1"
                  >
                    <span>
                      {r.first_name && <strong>{r.first_name} </strong>}
                      <span className="text-muted-foreground">{r.email}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          r.status === "sent"
                            ? "bg-green-100 text-green-700"
                            : r.status === "failed"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {r.status === "sent"
                          ? "Envoyé"
                          : r.status === "failed"
                            ? "Erreur"
                            : "En attente"}
                      </span>
                      {r.status === "pending" && campaign.status === "draft" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(r.id)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add contacts */}
          {campaign.status === "draft" && (
            <div>
              <h3 className="text-sm font-semibold mb-2">
                Ajouter des contacts
              </h3>
              <Input
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                placeholder="Rechercher un contact…"
                className="mb-2"
              />
              <div className="space-y-1 max-h-56 overflow-y-auto border rounded-md p-2">
                {contacts
                  .filter((c) => c.email_jsonb?.[0]?.email)
                  .map((c) => {
                    const alreadyAdded = currentRecipients.some(
                      (r: any) => r.contact_id === c.id,
                    );
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-2 text-sm py-1 cursor-pointer ${alreadyAdded ? "opacity-40" : ""}`}
                      >
                        <Checkbox
                          checked={selectedContactIds.has(c.id) || alreadyAdded}
                          disabled={alreadyAdded}
                          onCheckedChange={() => toggleContact(c.id)}
                        />
                        <span>
                          {c.first_name} {c.last_name}
                        </span>
                        <span className="text-muted-foreground">
                          — {c.email_jsonb[0].email}
                        </span>
                        {alreadyAdded && (
                          <Badge variant="outline" className="text-xs ml-auto">
                            Déjà ajouté
                          </Badge>
                        )}
                      </label>
                    );
                  })}
              </div>
              <Button
                className="mt-3 w-full"
                onClick={handleAddSelected}
                disabled={selectedContactIds.size === 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter {selectedContactIds.size > 0
                  ? `${selectedContactIds.size} contact(s)`
                  : "les sélectionnés"}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
