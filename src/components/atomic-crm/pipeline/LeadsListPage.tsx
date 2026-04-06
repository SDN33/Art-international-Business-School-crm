import { useState } from "react";
import { useGetList, useUpdate, useNotify, useRefresh, useDataProvider } from "ra-core";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { syncDealsStageFromContact } from "./syncPipelineStatus";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Pencil } from "lucide-react";

const PIPELINE_STATUS_COLORS: Record<string, string> = {
  "Nouveau lead": "bg-purple-100 text-purple-700",
  "Contacté WA": "bg-teal-100 text-teal-700",
  "À rappeler": "bg-amber-100 text-amber-700",
  "Qualifié": "bg-indigo-100 text-indigo-700",
  "Qualifié AFDAS": "bg-emerald-100 text-emerald-700",
  "Inscrit": "bg-green-100 text-green-700",
  "Converti": "bg-green-200 text-green-800",
  "Perdu": "bg-red-100 text-red-700",
};

const ORIGINE_OPTIONS = [
  "Site web",
  "Instagram",
  "WhatsApp",
  "Facebook",
  "Recommandation",
  "Salon",
  "Événement",
  "Autre",
];

type Contact = {
  id: number;
  first_name: string;
  last_name: string;
  email_jsonb: { email: string }[] | null;
  phone_jsonb: { phone: string }[] | null;
  pipeline_status: string | null;
  formation_souhaitee: string | null;
  origine_lead: string | null;
  first_seen: string | null;
};

type FormData = {
  pipeline_status: string;
  formation_souhaitee: string;
  origine_lead: string;
};

export const LeadsListPage = () => {
  const { dealStages } = useConfigurationContext();
  // Derive pipeline statuses from configuration deal stages
  const pipelineStatuses = dealStages.map((s) => s.label);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formationFilter, setFormationFilter] = useState("all");
  const [dialogMode, setDialogMode] = useState<null | "edit">(null);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [form, setForm] = useState<FormData>({ pipeline_status: "", formation_souhaitee: "", origine_lead: "" });

  const notify = useNotify();
  const refresh = useRefresh();
  const [update] = useUpdate();
  const dataProvider = useDataProvider();

  /** After updating a contact's pipeline_status, sync the linked deals' stage */
  const syncDealsStage = async (contactId: number, newStatus: string) => {
    await syncDealsStageFromContact(contactId, newStatus, dataProvider);
  };

  const buildFilter = () => {
    const f: Record<string, string> = {};
    if (search) f["first_name@ilike"] = `%${search}%`;
    if (statusFilter !== "all") f["pipeline_status@eq"] = statusFilter;
    if (formationFilter !== "all")
      f["formation_souhaitee@eq"] = formationFilter;
    return f;
  };

  const { data: contacts, isLoading } = useGetList<Contact>("contacts", {
    pagination: { page: 1, perPage: 1000 },
    sort: { field: "first_seen", order: "DESC" },
    filter: buildFilter(),
  });

  const { data: allContacts } = useGetList<Contact>("contacts", {
    pagination: { page: 1, perPage: 1000 },
    sort: { field: "id", order: "ASC" },
  });

  const formations = [
    ...new Set(
      (allContacts ?? [])
        .map((c) => c.formation_souhaitee)
        .filter(Boolean) as string[]
    ),
  ].sort();

  const getEmail = (c: Contact) => {
    if (!c.email_jsonb || !Array.isArray(c.email_jsonb)) return "–";
    const entry = c.email_jsonb[0] as Record<string, string> | undefined;
    return entry?.email ?? "–";
  };
  const getPhone = (c: Contact) => {
    if (!c.phone_jsonb || !Array.isArray(c.phone_jsonb)) return "–";
    const entry = c.phone_jsonb[0] as Record<string, string> | undefined;
    return entry?.number ?? entry?.phone ?? entry?.value ?? "–";
  };

  const openEdit = (contact: Contact) => {
    setSelected(contact);
    setForm({
      pipeline_status: contact.pipeline_status ?? "",
      formation_souhaitee: contact.formation_souhaitee ?? "",
      origine_lead: contact.origine_lead ?? "",
    });
    setDialogMode("edit");
  };

  const handleSave = () => {
    if (!selected) return;
    const data: Record<string, unknown> = {
      pipeline_status: form.pipeline_status || null,
      formation_souhaitee: form.formation_souhaitee || null,
      origine_lead: form.origine_lead || null,
    };
    update("contacts", { id: selected.id, data, previousData: selected }, {
      onSuccess: () => {
        notify("Lead mis à jour", { type: "success" });
        if (form.pipeline_status) syncDealsStage(selected.id, form.pipeline_status);
        setDialogMode(null);
        refresh();
      },
      onError: () => notify("Erreur lors de la mise à jour", { type: "error" }),
    });
  };

  const quickUpdateStatus = (contact: Contact, newStatus: string) => {
    update("contacts", { id: contact.id, data: { pipeline_status: newStatus }, previousData: contact }, {
      onSuccess: () => { notify("Statut mis à jour", { type: "success" }); syncDealsStage(contact.id, newStatus); refresh(); },
      onError: () => notify("Erreur", { type: "error" }),
    });
  };

  const updateField = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="p-6 space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Leads liste</h1>
        <p className="text-muted-foreground text-sm">
          Vue tableau de tous les leads — cliquez pour modifier le statut pipeline.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-52"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Statut Pipeline" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {pipelineStatuses.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={formationFilter} onValueChange={setFormationFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Formation souhaitée" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les formations</SelectItem>
            {formations.map((f) => (
              <SelectItem key={f} value={f}>{f}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(statusFilter !== "all" || formationFilter !== "all" || search) && (
          <button
            className="text-sm text-primary hover:underline"
            onClick={() => { setSearch(""); setStatusFilter("all"); setFormationFilter("all"); }}
          >
            Réinitialiser
          </button>
        )}
        {contacts && (
          <span className="ml-auto text-sm text-muted-foreground self-center">
            {contacts.length} lead{contacts.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Statut Pipeline</TableHead>
              <TableHead>Prénom</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Formation souhaitée</TableHead>
              <TableHead>Origine</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                  Chargement…
                </TableCell>
              </TableRow>
            ) : !contacts?.length ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                  Aucun lead trouvé
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow key={contact.id} className="hover:bg-muted/50">
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={contact.pipeline_status ?? ""}
                      onValueChange={(v) => quickUpdateStatus(contact, v)}
                    >
                      <SelectTrigger className="h-7 w-36 text-xs border-none shadow-none">
                        <SelectValue>
                          {contact.pipeline_status ? (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PIPELINE_STATUS_COLORS[contact.pipeline_status] ?? "bg-gray-100 text-gray-700"}`}>
                              {contact.pipeline_status}
                            </span>
                          ) : "–"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {pipelineStatuses.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link to={`/contacts/${contact.id}/show`} className="hover:underline text-primary">
                      {contact.first_name ?? "–"}
                    </Link>
                  </TableCell>
                  <TableCell>{contact.last_name ?? "–"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {getEmail(contact)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {getPhone(contact)}
                  </TableCell>
                  <TableCell>
                    {contact.formation_souhaitee ? (
                      <Badge variant="secondary" className="text-xs">{contact.formation_souhaitee}</Badge>
                    ) : <span className="text-muted-foreground text-xs">–</span>}
                  </TableCell>
                  <TableCell>
                    {contact.origine_lead ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-700">
                        {contact.origine_lead}
                      </span>
                    ) : <span className="text-muted-foreground text-xs">–</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {contact.first_seen
                      ? new Date(contact.first_seen).toLocaleDateString("fr-FR")
                      : "–"}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(contact)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Lead Dialog */}
      <Dialog open={dialogMode === "edit"} onOpenChange={() => setDialogMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Modifier le lead — {selected?.first_name} {selected?.last_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Statut pipeline</Label>
              <Select value={form.pipeline_status} onValueChange={(v) => updateField("pipeline_status", v)}>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>
                  {pipelineStatuses.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Formation souhaitée</Label>
              <Input value={form.formation_souhaitee} onChange={(e) => updateField("formation_souhaitee", e.target.value)} placeholder="Ex: Acteur Leader" />
            </div>
            <div className="space-y-1.5">
              <Label>Origine du lead</Label>
              <Select value={form.origine_lead} onValueChange={(v) => updateField("origine_lead", v)}>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>
                  {ORIGINE_OPTIONS.map((o) => (<SelectItem key={o} value={o}>{o}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-between pt-2">
            <Link to={`/contacts/${selected?.id}/show`} className="text-sm text-primary hover:underline self-center">
              Voir fiche contact complète
            </Link>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogMode(null)}>Annuler</Button>
              <Button onClick={handleSave}>Enregistrer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
