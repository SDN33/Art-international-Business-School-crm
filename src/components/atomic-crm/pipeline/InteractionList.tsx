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
import { Search, MessageSquare, Plus, Pencil, Trash2 } from "lucide-react";

const TYPE_OPTIONS = [
  "Appel téléphonique",
  "Email",
  "Message WhatsApp",
  "Réunion en ligne",
  "Réunion présentiel",
];
const CANAL_OPTIONS = ["Téléphone", "Email", "WhatsApp", "Zoom", "Présentiel"];
const STATUT_OPTIONS = ["À faire", "Fait", "En attente"];

const TYPE_COLORS: Record<string, string> = {
  "Appel téléphonique": "bg-blue-100 text-blue-700",
  Email: "bg-purple-100 text-purple-700",
  "Message WhatsApp": "bg-green-100 text-green-700",
  "Réunion en ligne": "bg-yellow-100 text-yellow-700",
  "Réunion présentiel": "bg-orange-100 text-orange-700",
};

const STATUT_COLORS: Record<string, string> = {
  "À faire": "bg-gray-100 text-gray-700",
  Fait: "bg-green-100 text-green-700",
  "En attente": "bg-yellow-100 text-yellow-700",
};

type Interaction = {
  id: number;
  titre: string | null;
  date_heure: string | null;
  type_interaction: string | null;
  message: string | null;
  canal: string | null;
  statut_suivi: string | null;
  responsable: string | null;
  contact_id: number | null;
  created_at: string;
};

type FormData = {
  titre: string;
  date_heure: string;
  type_interaction: string;
  message: string;
  canal: string;
  statut_suivi: string;
  responsable: string;
  contact_id: string;
};

const emptyForm: FormData = {
  titre: "",
  date_heure: "",
  type_interaction: "",
  message: "",
  canal: "",
  statut_suivi: "",
  responsable: "",
  contact_id: "",
};

export const InteractionList = () => {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statutFilter, setStatutFilter] = useState("all");
  const [dialogMode, setDialogMode] = useState<null | "create" | "edit">(null);
  const [selected, setSelected] = useState<Interaction | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  const notify = useNotify();
  const refresh = useRefresh();
  const [create] = useCreate();
  const [update] = useUpdate();
  const [deleteOne] = useDelete();

  const buildFilter = () => {
    const f: Record<string, string> = {};
    if (search) f["titre@ilike"] = `%${search}%`;
    if (typeFilter !== "all") f["type_interaction@eq"] = typeFilter;
    if (statutFilter !== "all") f["statut_suivi@eq"] = statutFilter;
    return f;
  };

  const { data: interactions, isLoading } = useGetList<Interaction>(
    "interactions",
    {
      pagination: { page: 1, perPage: 200 },
      sort: { field: "date_heure", order: "DESC" },
      filter: buildFilter(),
    }
  );

  const types = [
    ...new Set(TYPE_OPTIONS),
    ...new Set(
      (interactions ?? [])
        .map((i) => i.type_interaction)
        .filter(Boolean) as string[]
    ),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const openCreate = () => {
    setForm(emptyForm);
    setSelected(null);
    setDialogMode("create");
  };

  const openEdit = (item: Interaction) => {
    setSelected(item);
    setForm({
      titre: item.titre ?? "",
      date_heure: item.date_heure?.slice(0, 16) ?? "",
      type_interaction: item.type_interaction ?? "",
      message: item.message ?? "",
      canal: item.canal ?? "",
      statut_suivi: item.statut_suivi ?? "",
      responsable: item.responsable ?? "",
      contact_id: item.contact_id?.toString() ?? "",
    });
    setDialogMode("edit");
  };

  const handleSave = () => {
    const data: Record<string, unknown> = {
      titre: form.titre || null,
      date_heure: form.date_heure || null,
      type_interaction: form.type_interaction || null,
      message: form.message || null,
      canal: form.canal || null,
      statut_suivi: form.statut_suivi || null,
      responsable: form.responsable || null,
      contact_id: form.contact_id ? Number(form.contact_id) : null,
    };
    if (dialogMode === "create") {
      create("interactions", { data }, {
        onSuccess: () => { notify("Interaction créée", { type: "success" }); setDialogMode(null); refresh(); },
        onError: () => notify("Erreur lors de la création", { type: "error" }),
      });
    } else if (dialogMode === "edit" && selected) {
      update("interactions", { id: selected.id, data, previousData: selected }, {
        onSuccess: () => { notify("Interaction mise à jour", { type: "success" }); setDialogMode(null); refresh(); },
        onError: () => notify("Erreur lors de la mise à jour", { type: "error" }),
      });
    }
  };

  const handleDelete = (item: Interaction) => {
    if (!confirm("Supprimer cette interaction ?")) return;
    deleteOne("interactions", { id: item.id, previousData: item }, {
      onSuccess: () => { notify("Interaction supprimée", { type: "success" }); refresh(); },
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
            <MessageSquare className="h-6 w-6" />
            Interactions
          </h1>
          <p className="text-muted-foreground text-sm">
            Historique des interactions commerciales.
          </p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle interaction
        </Button>
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
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {types.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statutFilter} onValueChange={setStatutFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Statut suivi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {STATUT_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(typeFilter !== "all" || statutFilter !== "all" || search) && (
          <button
            className="text-sm text-primary hover:underline"
            onClick={() => {
              setSearch("");
              setTypeFilter("all");
              setStatutFilter("all");
            }}
          >
            Réinitialiser
          </button>
        )}
        {interactions && (
          <span className="ml-auto text-sm text-muted-foreground self-center">
            {interactions.length} interaction{interactions.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Date / Heure</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Responsable</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  Chargement…
                </TableCell>
              </TableRow>
            ) : !interactions?.length ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  Aucune interaction trouvée
                </TableCell>
              </TableRow>
            ) : (
              interactions.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => openEdit(item)}>
                  <TableCell className="font-medium max-w-xs truncate">
                    {item.titre ?? "–"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {item.date_heure
                      ? new Date(item.date_heure).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "–"}
                  </TableCell>
                  <TableCell>
                    {item.type_interaction ? (
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          TYPE_COLORS[item.type_interaction] ??
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {item.type_interaction}
                      </span>
                    ) : (
                      "–"
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{item.canal ?? "–"}</TableCell>
                  <TableCell>
                    {item.statut_suivi ? (
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUT_COLORS[item.statut_suivi] ??
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {item.statut_suivi}
                      </span>
                    ) : (
                      "–"
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{item.responsable ?? "–"}</TableCell>
                  <TableCell>
                    {item.contact_id ? (
                      <Link
                        to={`/contacts/${item.contact_id}/show`}
                        className="text-primary hover:underline text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Voir
                      </Link>
                    ) : (
                      "–"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(item)}>
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
              {dialogMode === "create" ? "Nouvelle interaction" : "Modifier l'interaction"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Titre</Label>
              <Input value={form.titre} onChange={(e) => updateField("titre", e.target.value)} placeholder="Titre de l'interaction" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Date / Heure</Label>
                <Input type="datetime-local" value={form.date_heure} onChange={(e) => updateField("date_heure", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Type d'interaction</Label>
                <Select value={form.type_interaction} onValueChange={(v) => updateField("type_interaction", v)}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Canal</Label>
                <Select value={form.canal} onValueChange={(v) => updateField("canal", v)}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    {CANAL_OPTIONS.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Statut suivi</Label>
                <Select value={form.statut_suivi} onValueChange={(v) => updateField("statut_suivi", v)}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    {STATUT_OPTIONS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Responsable</Label>
                <Input value={form.responsable} onChange={(e) => updateField("responsable", e.target.value)} placeholder="Nom du responsable" />
              </div>
              <div className="space-y-1.5">
                <Label>Contact ID</Label>
                <Input type="number" value={form.contact_id} onChange={(e) => updateField("contact_id", e.target.value)} placeholder="ID du contact" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Message</Label>
              <Textarea value={form.message} onChange={(e) => updateField("message", e.target.value)} placeholder="Contenu du message..." rows={3} />
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
