import { useState } from "react";
import { useGetList, useCreate, useUpdate, useDelete, useNotify, useRefresh } from "ra-core";
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
import { Search, Mail, Plus, Pencil, Trash2 } from "lucide-react";

const STATUT_OPTIONS = ["Abonné", "Désabonné", "En attente"];
const LANGUE_OPTIONS = ["Français", "Anglais", "Espagnol", "Arabe"];
const SOURCE_OPTIONS = ["Site web", "Événement", "Réseaux sociaux", "Recommandation", "Autre"];

const STATUT_COLORS: Record<string, string> = {
  Abonné: "bg-green-100 text-green-700",
  Désabonné: "bg-red-100 text-red-700",
  "En attente": "bg-yellow-100 text-yellow-700",
};

type NewsletterSubscriber = {
  id: number;
  email: string;
  prenom: string | null;
  date_inscription: string | null;
  source: string | null;
  statut: string | null;
  date_desabonnement: string | null;
  langue: string | null;
};

type FormData = {
  email: string;
  prenom: string;
  date_inscription: string;
  source: string;
  statut: string;
  date_desabonnement: string;
  langue: string;
};

const emptyForm: FormData = {
  email: "",
  prenom: "",
  date_inscription: "",
  source: "",
  statut: "",
  date_desabonnement: "",
  langue: "",
};

export const NewsletterList = () => {
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState("all");
  const [langueFilter, setLangueFilter] = useState("all");
  const [dialogMode, setDialogMode] = useState<null | "create" | "edit">(null);
  const [selected, setSelected] = useState<NewsletterSubscriber | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  const notify = useNotify();
  const refresh = useRefresh();
  const [create] = useCreate();
  const [update] = useUpdate();
  const [deleteOne] = useDelete();

  const buildFilter = () => {
    const f: Record<string, string> = {};
    if (search) f["email@ilike"] = `%${search}%`;
    if (statutFilter !== "all") f["statut@eq"] = statutFilter;
    if (langueFilter !== "all") f["langue@eq"] = langueFilter;
    return f;
  };

  const { data: subscribers, isLoading } = useGetList<NewsletterSubscriber>(
    "newsletter_subscribers",
    {
      pagination: { page: 1, perPage: 200 },
      sort: { field: "date_inscription", order: "DESC" },
      filter: buildFilter(),
    }
  );

  const openCreate = () => {
    setForm(emptyForm);
    setSelected(null);
    setDialogMode("create");
  };

  const openEdit = (item: NewsletterSubscriber) => {
    setSelected(item);
    setForm({
      email: item.email ?? "",
      prenom: item.prenom ?? "",
      date_inscription: item.date_inscription ?? "",
      source: item.source ?? "",
      statut: item.statut ?? "",
      date_desabonnement: item.date_desabonnement ?? "",
      langue: item.langue ?? "",
    });
    setDialogMode("edit");
  };

  const handleSave = () => {
    const data: Record<string, unknown> = {
      email: form.email,
      prenom: form.prenom || null,
      date_inscription: form.date_inscription || null,
      source: form.source || null,
      statut: form.statut || null,
      date_desabonnement: form.date_desabonnement || null,
      langue: form.langue || null,
    };
    if (dialogMode === "create") {
      create("newsletter_subscribers", { data }, {
        onSuccess: () => { notify("Abonné créé", { type: "success" }); setDialogMode(null); refresh(); },
        onError: () => notify("Erreur lors de la création", { type: "error" }),
      });
    } else if (dialogMode === "edit" && selected) {
      update("newsletter_subscribers", { id: selected.id, data, previousData: selected }, {
        onSuccess: () => { notify("Abonné mis à jour", { type: "success" }); setDialogMode(null); refresh(); },
        onError: () => notify("Erreur lors de la mise à jour", { type: "error" }),
      });
    }
  };

  const handleDelete = (item: NewsletterSubscriber) => {
    if (!confirm("Supprimer cet abonné ?")) return;
    deleteOne("newsletter_subscribers", { id: item.id, previousData: item }, {
      onSuccess: () => { notify("Abonné supprimé", { type: "success" }); refresh(); },
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
            <Mail className="h-6 w-6" />
            Newsletter
          </h1>
          <p className="text-muted-foreground text-sm">
            Gérez les inscriptions à la newsletter.
          </p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nouvel abonné
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-60"
          />
        </div>
        <Select value={statutFilter} onValueChange={setStatutFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {STATUT_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={langueFilter} onValueChange={setLangueFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Langue" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les langues</SelectItem>
            {LANGUE_OPTIONS.map((l) => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(statutFilter !== "all" || langueFilter !== "all" || search) && (
          <button
            className="text-sm text-primary hover:underline"
            onClick={() => { setSearch(""); setStatutFilter("all"); setLangueFilter("all"); }}
          >
            Réinitialiser
          </button>
        )}
        {subscribers && (
          <span className="ml-auto text-sm text-muted-foreground self-center">
            {subscribers.length} abonné{subscribers.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Prénom</TableHead>
              <TableHead>Date d'inscription</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Désabonnement</TableHead>
              <TableHead>Langue</TableHead>
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
            ) : !subscribers?.length ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  Aucun abonné trouvé
                </TableCell>
              </TableRow>
            ) : (
              subscribers.map((sub) => (
                <TableRow key={sub.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => openEdit(sub)}>
                  <TableCell className="font-medium">{sub.email}</TableCell>
                  <TableCell>{sub.prenom ?? "–"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {sub.date_inscription
                      ? new Date(sub.date_inscription).toLocaleDateString("fr-FR")
                      : "–"}
                  </TableCell>
                  <TableCell className="text-sm">{sub.source ?? "–"}</TableCell>
                  <TableCell>
                    {sub.statut ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_COLORS[sub.statut] ?? "bg-gray-100 text-gray-700"}`}>
                        {sub.statut}
                      </span>
                    ) : "–"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {sub.date_desabonnement
                      ? new Date(sub.date_desabonnement).toLocaleDateString("fr-FR")
                      : "–"}
                  </TableCell>
                  <TableCell>
                    {sub.langue ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700">
                        {sub.langue}
                      </span>
                    ) : "–"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(sub)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(sub)}>
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
              {dialogMode === "create" ? "Nouvel abonné" : "Modifier l'abonné"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="email@exemple.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Prénom</Label>
                <Input value={form.prenom} onChange={(e) => updateField("prenom", e.target.value)} placeholder="Prénom" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Date d'inscription</Label>
                <Input type="date" value={form.date_inscription} onChange={(e) => updateField("date_inscription", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select value={form.source} onValueChange={(v) => updateField("source", v)}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select value={form.statut} onValueChange={(v) => updateField("statut", v)}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    {STATUT_OPTIONS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Langue</Label>
                <Select value={form.langue} onValueChange={(v) => updateField("langue", v)}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    {LANGUE_OPTIONS.map((l) => (<SelectItem key={l} value={l}>{l}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Date de désabonnement</Label>
              <Input type="date" value={form.date_desabonnement} onChange={(e) => updateField("date_desabonnement", e.target.value)} />
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
              <Button onClick={handleSave} disabled={!form.email}>{dialogMode === "create" ? "Créer" : "Enregistrer"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
