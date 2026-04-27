import { useState } from "react";
import {
  useGetList,
  useCreate,
  useUpdate,
  useDelete,
  useNotify,
  useDataProvider,
} from "ra-core";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Trash2,
  Send,
  Users,
  MoreVertical,
  Pencil,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CrmDataProvider } from "../providers/types";

// ─── Types ───────────────────────────────────────────────────────────────────

type Campaign = {
  id: number;
  name: string;
  subject: string;
  html_body: string;
  status: "draft" | "sending" | "sent" | "failed";
  sent_at: string | null;
  total_sent: number;
  total_error: number;
  created_at: string;
};

type CampaignContact = {
  id: number;
  campaign_id: number;
  contact_id: number;
  email: string;
  first_name: string | null;
  status: "pending" | "sent" | "failed";
};

type Contact = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email_jsonb: { email: string; type?: string }[];
};

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_CFG = {
  draft: { label: "Brouillon", class: "bg-gray-100 text-gray-700", icon: <Clock className="h-3 w-3" /> },
  sending: { label: "En cours…", class: "bg-yellow-100 text-yellow-700", icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
  sent: { label: "Envoyée", class: "bg-green-100 text-green-700", icon: <CheckCircle className="h-3 w-3" /> },
  failed: { label: "Erreur", class: "bg-red-100 text-red-700", icon: <XCircle className="h-3 w-3" /> },
} as const;

const CONTACT_STATUS_CFG = {
  pending: { label: "En attente", class: "bg-gray-100 text-gray-600" },
  sent: { label: "Envoyé", class: "bg-green-100 text-green-700" },
  failed: { label: "Erreur", class: "bg-red-100 text-red-700" },
} as const;

const EMPTY_FORM = { name: "", subject: "", html_body: "" };

// ─── Preview Dialog ───────────────────────────────────────────────────────────

const PreviewDialog = ({
  open,
  onClose,
  campaign,
}: {
  open: boolean;
  onClose: () => void;
  campaign: Campaign | null;
}) => {
  if (!campaign) return null;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aperçu — {campaign.subject}</DialogTitle>
        </DialogHeader>
        <div className="border rounded-md p-4 bg-white">
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: campaign.html_body }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Create / Edit Dialog ─────────────────────────────────────────────────────

const CampaignFormDialog = ({
  open,
  onClose,
  campaign,
}: {
  open: boolean;
  onClose: () => void;
  campaign?: Campaign;
}) => {
  const notify = useNotify();
  const [create] = useCreate();
  const [update] = useUpdate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(
    campaign
      ? { name: campaign.name, subject: campaign.subject, html_body: campaign.html_body }
      : EMPTY_FORM,
  );
  const [previewOpen, setPreviewOpen] = useState(false);

  const isEdit = !!campaign;

  const handleSave = async () => {
    if (!form.name || !form.subject || !form.html_body) return;
    setSaving(true);
    try {
      if (isEdit) {
        await update(
          "email_campaigns",
          { id: campaign.id, data: form, previousData: campaign },
          { returnPromise: true },
        );
        notify("Campagne mise à jour", { type: "success" });
      } else {
        await create(
          "email_campaigns",
          { data: { ...form, status: "draft" } },
          { returnPromise: true },
        );
        notify("Brouillon créé", { type: "success" });
      }
      onClose();
    } catch {
      notify("Erreur lors de l'enregistrement", { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Modifier la campagne" : "Nouvelle campagne"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nom de la campagne *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex : Relance inscriptions octobre 2026"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Objet de l'email *</Label>
              <Input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Objet visible par le destinataire"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Corps de l'email (HTML ou texte) *</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setPreviewOpen(true)}
                  disabled={!form.html_body}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Aperçu
                </Button>
              </div>
              <Textarea
                value={form.html_body}
                onChange={(e) => setForm({ ...form, html_body: e.target.value })}
                placeholder={`Bonjour {{prenom}},\n\nNous avons le plaisir de vous informer...\n\nCordialement,\nL'équipe AIBS`}
                rows={14}
                className="resize-none font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Utilisez{" "}
                <code className="bg-muted px-1 rounded">{"{{prenom}}"}</code>{" "}
                pour personnaliser. Expéditeur :{" "}
                <strong>noreply@artaibs.fr</strong>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name || !form.subject || !form.html_body}
            >
              {saving ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer le brouillon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        campaign={form.html_body ? ({ ...campaign, ...form } as Campaign) : null}
      />
    </>
  );
};

// ─── Recipients Sheet ─────────────────────────────────────────────────────────

const RecipientsSheet = ({
  campaign,
  open,
  onClose,
}: {
  campaign: Campaign;
  open: boolean;
  onClose: () => void;
}) => {
  const notify = useNotify();
  const [create] = useCreate();
  const [deleteFn] = useDelete();
  const [contactSearch, setContactSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const {
    data: recipients = [],
    refetch: refetchRecipients,
  } = useGetList<CampaignContact>("email_campaign_contacts", {
    filter: { "campaign_id@eq": campaign.id },
    pagination: { page: 1, perPage: 1000 },
    sort: { field: "id", order: "ASC" },
  });

  const { data: contacts = [] } = useGetList<Contact>("contacts", {
    filter: contactSearch
      ? { "first_name@ilike": `%${contactSearch}%` }
      : {},
    pagination: { page: 1, perPage: 100 },
    sort: { field: "last_name", order: "ASC" },
  });

  const existingIds = new Set(recipients.map((r) => String(r.contact_id)));

  const eligibleContacts = contacts.filter(
    (c) => c.email_jsonb?.[0]?.email && !existingIds.has(String(c.id)),
  );

  const handleAdd = async () => {
    const toAdd = eligibleContacts.filter((c) => selected.has(String(c.id)));
    if (toAdd.length === 0) return;
    try {
      await Promise.all(
        toAdd.map((c) =>
          create(
            "email_campaign_contacts",
            {
              data: {
                campaign_id: campaign.id,
                contact_id: Number(c.id),
                email: c.email_jsonb[0].email,
                first_name: c.first_name ?? null,
                status: "pending",
              },
            },
            { returnPromise: true },
          ),
        ),
      );
      notify(`${toAdd.length} contact(s) ajouté(s)`, { type: "success" });
      setSelected(new Set());
      refetchRecipients();
    } catch {
      notify("Erreur lors de l'ajout", { type: "error" });
    }
  };

  const handleRemove = async (id: number) => {
    try {
      await deleteFn("email_campaign_contacts", { id }, { returnPromise: true });
      refetchRecipients();
    } catch {
      notify("Erreur lors de la suppression", { type: "error" });
    }
  };

  const handleRemoveAll = async () => {
    if (!confirm(`Retirer les ${recipients.length} destinataires ?`)) return;
    try {
      await Promise.all(
        recipients.map((r) =>
          deleteFn("email_campaign_contacts", { id: r.id }, { returnPromise: true }),
        ),
      );
      refetchRecipients();
    } catch {
      notify("Erreur lors de la suppression", { type: "error" });
    }
  };

  const toggleContact = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === eligibleContacts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(eligibleContacts.map((c) => String(c.id))));
    }
  };

  const sent = recipients.filter((r) => r.status === "sent").length;
  const failed = recipients.filter((r) => r.status === "failed").length;
  const pending = recipients.filter((r) => r.status === "pending").length;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Destinataires — {campaign.name}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-5 space-y-6">
          {/* Current recipients */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">
                Liste actuelle ({recipients.length})
              </h3>
              {campaign.status === "sent" && (
                <div className="flex gap-2 text-xs">
                  <span className="text-green-600">{sent} envoyés</span>
                  {failed > 0 && <span className="text-red-600">{failed} erreurs</span>}
                  {pending > 0 && <span className="text-gray-500">{pending} en attente</span>}
                </div>
              )}
              {recipients.length > 0 && campaign.status === "draft" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive text-xs"
                  onClick={handleRemoveAll}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Tout retirer
                </Button>
              )}
            </div>
            {recipients.length === 0 ? (
              <p className="text-muted-foreground text-sm py-3 text-center border rounded-lg">
                Aucun destinataire. Ajoutez des contacts ci-dessous.
              </p>
            ) : (
              <div className="space-y-1 max-h-52 overflow-y-auto border rounded-lg p-2">
                {recipients.map((r) => {
                  const sc = CONTACT_STATUS_CFG[r.status] ?? CONTACT_STATUS_CFG.pending;
                  return (
                    <div
                      key={r.id}
                      className="flex items-center justify-between text-sm py-1.5 px-1"
                    >
                      <div className="min-w-0">
                        {r.first_name && (
                          <span className="font-medium">{r.first_name} </span>
                        )}
                        <span className="text-muted-foreground text-xs">{r.email}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn("text-xs px-1.5 py-0.5 rounded-full", sc.class)}>
                          {sc.label}
                        </span>
                        {campaign.status === "draft" && (
                          <button
                            onClick={() => handleRemove(r.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add contacts — only for draft */}
          {campaign.status === "draft" && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Ajouter des contacts</h3>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par prénom…"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="pl-9 h-8 text-sm"
                />
              </div>
              {eligibleContacts.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-3">
                  {contactSearch
                    ? "Aucun contact trouvé"
                    : "Tous les contacts ont déjà été ajoutés"}
                </p>
              ) : (
                <>
                  <div className="space-y-1 max-h-52 overflow-y-auto border rounded-lg p-2">
                    {/* Select all */}
                    <div className="flex items-center gap-2 px-1 py-1 border-b mb-1">
                      <Checkbox
                        id="select-all"
                        checked={selected.size === eligibleContacts.length && eligibleContacts.length > 0}
                        onCheckedChange={toggleAll}
                      />
                      <label htmlFor="select-all" className="text-xs text-muted-foreground cursor-pointer">
                        Sélectionner tout ({eligibleContacts.length})
                      </label>
                    </div>
                    {eligibleContacts.map((c) => {
                      const email = c.email_jsonb[0]?.email;
                      const cid = String(c.id);
                      return (
                        <div
                          key={c.id}
                          className="flex items-center gap-2 text-sm py-1.5 px-1 rounded hover:bg-muted/50"
                        >
                          <Checkbox
                            id={`c-${c.id}`}
                            checked={selected.has(cid)}
                            onCheckedChange={() => toggleContact(cid)}
                          />
                          <label
                            htmlFor={`c-${c.id}`}
                            className="flex-1 min-w-0 cursor-pointer"
                          >
                            <span className="font-medium">
                              {c.first_name} {c.last_name}
                            </span>
                            <span className="text-muted-foreground text-xs ml-2">
                              {email}
                            </span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  <Button
                    className="w-full mt-2"
                    size="sm"
                    disabled={selected.size === 0}
                    onClick={handleAdd}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter {selected.size > 0 ? `${selected.size} contact(s)` : ""}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export const EmailCampaignsTab = () => {
  const notify = useNotify();
  const dataProvider = useDataProvider<CrmDataProvider>();
  const [deleteCampaign] = useDelete();

  const [createOpen, setCreateOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);
  const [recipientsCampaign, setRecipientsCampaign] = useState<Campaign | null>(null);
  const [sending, setSending] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const { data: campaigns = [], isLoading, refetch } = useGetList<Campaign>(
    "email_campaigns",
    {
      pagination: { page: 1, perPage: 200 },
      sort: { field: "created_at", order: "DESC" },
    },
  );

  const filtered = campaigns.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.subject.toLowerCase().includes(q)
    );
  });

  const handleDelete = async (campaign: Campaign) => {
    if (!confirm(`Supprimer la campagne "${campaign.name}" ?`)) return;
    try {
      await deleteCampaign("email_campaigns", { id: campaign.id }, { returnPromise: true });
      notify("Campagne supprimée", { type: "success" });
      refetch();
    } catch {
      notify("Erreur lors de la suppression", { type: "error" });
    }
  };

  const handleSend = async (campaign: Campaign) => {
    const count = campaign.total_sent + campaign.total_error || 0;
    if (
      !confirm(
        `Envoyer la campagne "${campaign.name}" ?\n\nCette action est irréversible.`,
      )
    )
      return;
    setSending(campaign.id);
    try {
      const result = await dataProvider.sendCampaign(campaign.id);
      notify(
        `Campagne envoyée : ${result.total_sent} OK${result.total_error > 0 ? `, ${result.total_error} erreurs` : ""}`,
        { type: result.total_error > 0 ? "warning" : "success" },
      );
      refetch();
    } catch {
      notify("Erreur lors de l'envoi", { type: "error" });
    } finally {
      setSending(null);
    }
  };

  const stats = {
    total: campaigns.length,
    draft: campaigns.filter((c) => c.status === "draft").length,
    sent: campaigns.filter((c) => c.status === "sent").length,
  };

  return (
    <div className="p-4 md:p-6">
      {/* Stats bar */}
      {campaigns.length > 0 && (
        <div className="flex gap-4 mb-4 text-sm text-muted-foreground">
          <span>{stats.total} campagne(s)</span>
          <span>·</span>
          <span className="text-yellow-600">{stats.draft} brouillon(s)</span>
          <span>·</span>
          <span className="text-green-600">{stats.sent} envoyée(s)</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une campagne…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} title="Actualiser">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle campagne
          </Button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Mail className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Aucune campagne</p>
          <p className="text-xs mt-1">Créez votre première campagne emailing</p>
        </div>
      ) : (
        <div className="divide-y border rounded-lg overflow-hidden">
          {filtered.map((c) => {
            const sc = STATUS_CFG[c.status] ?? STATUS_CFG.draft;
            const isSending = sending === c.id;
            const recipientCount = 0; // loaded lazily in sheet

            return (
              <div
                key={c.id}
                className="flex items-start gap-3 p-3 sm:p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{c.name}</span>
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1",
                        sc.class,
                      )}
                    >
                      {sc.icon}
                      {sc.label}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{c.subject}</div>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span>
                      {c.sent_at
                        ? `Envoyée le ${new Date(c.sent_at).toLocaleDateString("fr-FR")}`
                        : `Créée le ${new Date(c.created_at).toLocaleDateString("fr-FR")}`}
                    </span>
                    {c.status === "sent" && (
                      <>
                        <span>·</span>
                        <span className="text-green-600">
                          {c.total_sent} envoyés
                        </span>
                        {c.total_error > 0 && (
                          <>
                            <span>·</span>
                            <span className="text-red-600">
                              {c.total_error} erreurs
                            </span>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Destinataires"
                    onClick={() => setRecipientsCampaign(c)}
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                  {c.status === "draft" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Envoyer"
                      disabled={isSending}
                      onClick={() => handleSend(c)}
                      className="text-primary"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setPreviewCampaign(c)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Aperçu
                      </DropdownMenuItem>
                      {c.status === "draft" && (
                        <>
                          <DropdownMenuItem onClick={() => setEditCampaign(c)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDelete(c)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialogs / Sheets */}
      <CampaignFormDialog
        open={createOpen}
        onClose={() => { setCreateOpen(false); refetch(); }}
      />
      {editCampaign && (
        <CampaignFormDialog
          open={!!editCampaign}
          onClose={() => { setEditCampaign(null); refetch(); }}
          campaign={editCampaign}
        />
      )}
      <PreviewDialog
        open={!!previewCampaign}
        onClose={() => setPreviewCampaign(null)}
        campaign={previewCampaign}
      />
      {recipientsCampaign && (
        <RecipientsSheet
          campaign={recipientsCampaign}
          open={!!recipientsCampaign}
          onClose={() => { setRecipientsCampaign(null); refetch(); }}
        />
      )}
    </div>
  );
};
