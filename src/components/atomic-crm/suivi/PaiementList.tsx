import { useState } from "react";
import { useGetList, useCreate, useUpdate, useDelete, useNotify, useRefresh } from "ra-core";
import { Link } from "react-router";
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
import { Textarea } from "@/components/ui/textarea";
import { Search, CreditCard, Plus, Pencil, Trash2 } from "lucide-react";

const STATUT_OPTIONS = ["Payé", "En attente", "Partiellement payé", "Remboursé", "Annulé"];
const MODE_OPTIONS = ["Virement", "Carte bancaire", "Chèque", "Espèces", "Prélèvement", "PayPal"];
const FINANCEMENT_OPTIONS = ["Personnel", "OPCO", "CPF", "Employeur", "Pôle emploi", "Autre"];

const STATUT_COLORS: Record<string, string> = {
  Payé: "bg-green-100 text-green-700",
  "En attente": "bg-yellow-100 text-yellow-700",
  "Partiellement payé": "bg-orange-100 text-orange-700",
  Remboursé: "bg-gray-100 text-gray-700",
  Annulé: "bg-red-100 text-red-700",
};

type Paiement = {
  id: number;
  numero_paiement: string | null;
  date_paiement: string | null;
  montant: number | null;
  statut_paiement: string | null;
  mode_paiement: string | null;
  type_financement: string | null;
  commentaire: string | null;
  contact_id: number | null;
  inscription_id: number | null;
};

type FormData = {
  numero_paiement: string;
  date_paiement: string;
  montant: string;
  statut_paiement: string;
  mode_paiement: string;
  type_financement: string;
  commentaire: string;
  contact_id: string;
  inscription_id: string;
};

const emptyForm: FormData = {
  numero_paiement: "",
  date_paiement: "",
  montant: "",
  statut_paiement: "",
  mode_paiement: "",
  type_financement: "",
  commentaire: "",
  contact_id: "",
  inscription_id: "",
};

export const PaiementList = () => {
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [dialogMode, setDialogMode] = useState<null | "create" | "edit">(null);
  const [selected, setSelected] = useState<Paiement | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  const notify = useNotify();
  const refresh = useRefresh();
  const [create] = useCreate();
  const [update] = useUpdate();
  const [deleteOne] = useDelete();

  const buildFilter = () => {
    const f: Record<string, string> = {};
    if (search) f["numero_paiement@ilike"] = `%${search}%`;
    if (statutFilter !== "all") f["statut_paiement@eq"] = statutFilter;
    if (modeFilter !== "all") f["mode_paiement@eq"] = modeFilter;
    return f;
  };

  const { data: paiements, isLoading } = useGetList<Paiement>("paiements", {
    pagination: { page: 1, perPage: 200 },
    sort: { field: "date_paiement", order: "DESC" },
    filter: buildFilter(),
  });

  const totalMontant = (paiements ?? []).reduce(
    (sum, p) => sum + (p.montant ?? 0),
    0
  );

  const openCreate = () => {
    setForm(emptyForm);
    setSelected(null);
    setDialogMode("create");
  };

  const openEdit = (item: Paiement) => {
    setSelected(item);
    setForm({
      numero_paiement: item.numero_paiement ?? "",
      date_paiement: item.date_paiement ?? "",
      montant: item.montant?.toString() ?? "",
      statut_paiement: item.statut_paiement ?? "",
      mode_paiement: item.mode_paiement ?? "",
      type_financement: item.type_financement ?? "",
      commentaire: item.commentaire ?? "",
      contact_id: item.contact_id?.toString() ?? "",
      inscription_id: item.inscription_id?.toString() ?? "",
    });
    setDialogMode("edit");
  };

  const handleSave = () => {
    const data: Record<string, unknown> = {
      numero_paiement: form.numero_paiement || null,
      date_paiement: form.date_paiement || null,
      montant: form.montant ? Number(form.montant) : null,
      statut_paiement: form.statut_paiement || null,
      mode_paiement: form.mode_paiement || null,
      type_financement: form.type_financement || null,
      commentaire: form.commentaire || null,
      contact_id: form.contact_id ? Number(form.contact_id) : null,
      inscription_id: form.inscription_id ? Number(form.inscription_id) : null,
    };
    if (dialogMode === "create") {
      create("paiements", { data }, {
        onSuccess: () => { notify("Paiement créé", { type: "success" }); setDialogMode(null); refresh(); },
        onError: () => notify("Erreur lors de la création", { type: "error" }),
      });
    } else if (dialogMode === "edit" && selected) {
      update("paiements", { id: selected.id, data, previousData: selected }, {
        onSuccess: () => { notify("Paiement mis à jour", { type: "success" }); setDialogMode(null); refresh(); },
        onError: () => notify("Erreur lors de la mise à jour", { type: "error" }),
      });
    }
  };

  const handleDelete = (item: Paiement) => {
    if (!confirm("Supprimer ce paiement ?")) return;
    deleteOne("paiements", { id: item.id, previousData: item }, {
      onSuccess: () => { notify("Paiement supprimé", { type: "success" }); refresh(); },
      onError: () => notify("Erreur lors de la suppression", { type: "error" }),
    });
  };

  const updateField = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Paiements
          </h1>
          <p className="text-muted-foreground text-sm">
            Suivi des paiements, modes de règlement et financements.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {paiements && paiements.length > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                {totalMontant.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
              </div>
              <div className="text-xs text-muted-foreground">
                Total ({paiements.length} paiements)
              </div>
            </div>
          )}
          <Button onClick={openCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nouveau paiement
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="N° paiement..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-48"
          />
        </div>
        <Select value={statutFilter} onValueChange={setStatutFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Statut paiement" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {STATUT_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={modeFilter} onValueChange={setModeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Mode de paiement" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les modes</SelectItem>
            {MODE_OPTIONS.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(statutFilter !== "all" || modeFilter !== "all" || search) && (
          <button
            className="text-sm text-primary hover:underline"
            onClick={() => { setSearch(""); setStatutFilter("all"); setModeFilter("all"); }}
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° Paiement</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Financement</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Commentaire</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                  Chargement…
                </TableCell>
              </TableRow>
            ) : !paiements?.length ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                  Aucun paiement trouvé
                </TableCell>
              </TableRow>
            ) : (
              paiements.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => openEdit(p)}>
                  <TableCell className="font-mono text-sm">
                    {p.numero_paiement ?? `#${p.id}`}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {p.date_paiement
                      ? new Date(p.date_paiement).toLocaleDateString("fr-FR")
                      : "–"}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {p.montant != null
                      ? p.montant.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })
                      : "–"}
                  </TableCell>
                  <TableCell>
                    {p.statut_paiement ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_COLORS[p.statut_paiement] ?? "bg-gray-100 text-gray-700"}`}>
                        {p.statut_paiement}
                      </span>
                    ) : "–"}
                  </TableCell>
                  <TableCell className="text-sm">{p.mode_paiement ?? "–"}</TableCell>
                  <TableCell className="text-sm">{p.type_financement ?? "–"}</TableCell>
                  <TableCell>
                    {p.contact_id ? (
                      <Link to={`/contacts/${p.contact_id}/show`} className="text-primary hover:underline text-sm" onClick={(e) => e.stopPropagation()}>
                        Voir
                      </Link>
                    ) : "–"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {p.commentaire ?? "–"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(p)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={() => setDialogMode(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Nouveau paiement" : "Modifier le paiement"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>N° Paiement</Label>
                <Input value={form.numero_paiement} onChange={(e) => updateField("numero_paiement", e.target.value)} placeholder="PAY-001" />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={form.date_paiement} onChange={(e) => updateField("date_paiement", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Montant (€)</Label>
                <Input type="number" step="0.01" value={form.montant} onChange={(e) => updateField("montant", e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select value={form.statut_paiement} onValueChange={(v) => updateField("statut_paiement", v)}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    {STATUT_OPTIONS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Mode de paiement</Label>
                <Select value={form.mode_paiement} onValueChange={(v) => updateField("mode_paiement", v)}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    {MODE_OPTIONS.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Type de financement</Label>
                <Select value={form.type_financement} onValueChange={(v) => updateField("type_financement", v)}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    {FINANCEMENT_OPTIONS.map((f) => (<SelectItem key={f} value={f}>{f}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Contact ID</Label>
                <Input type="number" value={form.contact_id} onChange={(e) => updateField("contact_id", e.target.value)} placeholder="ID du contact" />
              </div>
              <div className="space-y-1.5">
                <Label>Inscription ID</Label>
                <Input type="number" value={form.inscription_id} onChange={(e) => updateField("inscription_id", e.target.value)} placeholder="ID de l'inscription" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Commentaire</Label>
              <Textarea value={form.commentaire} onChange={(e) => updateField("commentaire", e.target.value)} placeholder="Notes..." rows={2} />
            </div>
          </div>
          <div className="flex justify-between pt-2">
            <div>
              {dialogMode === "edit" && selected && (
                <Button variant="destructive" size="sm" onClick={() => { handleDelete(selected); setDialogMode(null); }}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Supprimer
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogMode(null)}>Annuler</Button>
              <Button onClick={handleSave}>{dialogMode === "create" ? "Créer" : "Enregistrer"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
