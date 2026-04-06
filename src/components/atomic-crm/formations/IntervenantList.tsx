import { useState, useRef } from "react";
import {
  useListContext,
  useCreate,
  useUpdate,
  useDelete,
  useNotify,
  useRefresh,
} from "ra-core";
import { List } from "@/components/admin/list";
import { SearchInput } from "@/components/admin/search-input";
import { SelectInput } from "@/components/admin/select-input";
import { FilterButton } from "@/components/admin/filter-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Avatar as ShadcnAvatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Mail,
  Phone,
  Camera,
  Calendar,
  FileText,
  Award,
} from "lucide-react";
import { TopToolbar } from "../layout/TopToolbar";
import { getSupabaseClient } from "../providers/supabase/supabase";

const statutChoices = [
  { id: "Externe", name: "Externe" },
  { id: "Interne", name: "Interne" },
  { id: "Partenaire", name: "Partenaire" },
];

const STATUT_COLORS: Record<string, string> = {
  Externe: "bg-orange-100 text-orange-700 border-orange-200",
  Interne: "bg-green-100 text-green-700 border-green-200",
  Partenaire: "bg-blue-100 text-blue-700 border-blue-200",
};

const intervenantFilters = [
  <SearchInput source="first_name@ilike" alwaysOn />,
  <SelectInput source="statut" choices={statutChoices} label="Statut" />,
];

const IntervenantList = () => (
  <List
    title="Intervenants"
    perPage={50}
    sort={{ field: "first_name", order: "ASC" }}
    filters={intervenantFilters}
    actions={
      <TopToolbar>
        <FilterButton />
      </TopToolbar>
    }
  >
    <IntervenantGrid />
  </List>
);

type Intervenant = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  biographie: string | null;
  specialites: string[] | null;
  statut: string | null;
  notes: string | null;
  date_ajout: string | null;
  hide_badge: boolean;
  avatar: { src: string } | null;
  created_at: string | null;
};

type FormData = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  biographie: string;
  specialites: string;
  statut: string;
  notes: string;
};

const emptyForm: FormData = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  biographie: "",
  specialites: "",
  statut: "Externe",
  notes: "",
};

const IntervenantGrid = () => {
  const { data, isPending } = useListContext();
  const [dialogMode, setDialogMode] = useState<null | "create" | "edit">(null);
  const [detailMode, setDetailMode] = useState<Intervenant | null>(null);
  const [selected, setSelected] = useState<Intervenant | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const notify = useNotify();
  const refresh = useRefresh();
  const [create] = useCreate();
  const [update] = useUpdate();
  const [deleteOne] = useDelete();

  const openCreate = () => {
    setForm(emptyForm);
    setSelected(null);
    setDialogMode("create");
  };

  const openEdit = (item: Intervenant) => {
    setSelected(item);
    setForm({
      first_name: item.first_name ?? "",
      last_name: item.last_name ?? "",
      email: item.email ?? "",
      phone: item.phone ?? "",
      biographie: item.biographie ?? "",
      specialites: item.specialites?.join(", ") ?? "",
      statut: item.statut ?? "Externe",
      notes: item.notes ?? "",
    });
    setDialogMode("edit");
  };

  const openDetail = (item: Intervenant) => {
    setDetailMode(item);
  };

  const handleSave = () => {
    const payload: Record<string, unknown> = {
      first_name: form.first_name || null,
      last_name: form.last_name || null,
      email: form.email || null,
      phone: form.phone || null,
      biographie: form.biographie || null,
      specialites: form.specialites
        ? form.specialites
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : null,
      statut: form.statut || null,
      notes: form.notes || null,
    };
    if (dialogMode === "create") {
      create(
        "intervenants",
        { data: payload },
        {
          onSuccess: () => {
            notify("Intervenant créé", { type: "success" });
            setDialogMode(null);
            refresh();
          },
          onError: () =>
            notify("Erreur lors de la création", { type: "error" }),
        },
      );
    } else if (dialogMode === "edit" && selected) {
      update(
        "intervenants",
        { id: selected.id, data: payload, previousData: selected },
        {
          onSuccess: () => {
            notify("Intervenant mis à jour", { type: "success" });
            setDialogMode(null);
            refresh();
          },
          onError: () =>
            notify("Erreur lors de la mise à jour", { type: "error" }),
        },
      );
    }
  };

  const handleDelete = (item: Intervenant) => {
    if (!confirm("Supprimer cet intervenant ?")) return;
    deleteOne(
      "intervenants",
      { id: item.id, previousData: item },
      {
        onSuccess: () => {
          notify("Intervenant supprimé", { type: "success" });
          setDetailMode(null);
          refresh();
        },
        onError: () =>
          notify("Erreur lors de la suppression", { type: "error" }),
      },
    );
  };

  const handleAvatarUpload = async (
    intervenant: Intervenant,
    file: File,
  ) => {
    setUploading(true);
    try {
      const supabase = getSupabaseClient();
      const ext = file.name.split(".").pop();
      const path = `intervenants/${intervenant.id}/avatar.${ext}`;

      await supabase.storage.from("attachments").remove([path]);
      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("attachments").getPublicUrl(path);

      update(
        "intervenants",
        {
          id: intervenant.id,
          data: { avatar: { src: publicUrl } },
          previousData: intervenant,
        },
        {
          onSuccess: () => {
            notify("Photo mise à jour", { type: "success" });
            refresh();
            if (detailMode?.id === intervenant.id) {
              setDetailMode({ ...intervenant, avatar: { src: publicUrl } });
            }
          },
          onError: () =>
            notify("Erreur lors de la mise à jour", { type: "error" }),
        },
      );
    } catch {
      notify("Erreur lors de l'upload", { type: "error" });
    } finally {
      setUploading(false);
    }
  };

  const updateField = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  if (isPending)
    return (
      <div className="p-8 text-center text-muted-foreground">
        Chargement...
      </div>
    );

  return (
    <>
      <div className="flex justify-end px-4 pt-2">
        <Button
          onClick={openCreate}
          size="sm"
          className="flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" /> Nouvel intervenant
        </Button>
      </div>

      {!data?.length ? (
        <div className="p-8 text-center text-muted-foreground">
          Aucun intervenant
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 p-4">
          {data.map((intervenant: Intervenant) => (
            <Card
              key={intervenant.id}
              className="overflow-hidden group cursor-pointer hover:shadow-lg transition-all duration-200 border-border/60"
              onClick={() => openDetail(intervenant)}
            >
              <CardContent className="p-0">
                {/* Header with avatar and name */}
                <div className="bg-linear-to-r from-muted/50 to-muted/20 p-4 pb-3">
                  <div className="flex items-start gap-3">
                    <div
                      className="relative group/avatar shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ShadcnAvatar className="h-14 w-14 border-2 border-background shadow-sm">
                        <AvatarImage
                          src={intervenant.avatar?.src ?? undefined}
                        />
                        <AvatarFallback className="text-base font-semibold bg-primary/10 text-primary">
                          {intervenant.first_name?.charAt(0)?.toUpperCase()}
                          {intervenant.last_name?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </ShadcnAvatar>
                      <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer">
                        <Camera className="h-5 w-5 text-white" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleAvatarUpload(intervenant, file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-base leading-tight">
                            {intervenant.first_name} {intervenant.last_name}
                          </p>
                          {intervenant.statut && (
                            <Badge
                              variant="outline"
                              className={`mt-1 text-[10px] ${STATUT_COLORS[intervenant.statut] ?? ""}`}
                            >
                              {intervenant.statut}
                            </Badge>
                          )}
                        </div>
                        <div
                          className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(intervenant)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(intervenant)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact info */}
                <div className="px-4 py-3 space-y-1.5">
                  {intervenant.email && (
                    <div
                      className="flex items-center gap-2 text-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <a
                        href={`mailto:${intervenant.email}`}
                        className="text-muted-foreground hover:text-foreground hover:underline truncate"
                      >
                        {intervenant.email}
                      </a>
                    </div>
                  )}
                  {intervenant.phone && (
                    <div
                      className="flex items-center gap-2 text-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <a
                        href={`tel:${intervenant.phone}`}
                        className="text-muted-foreground hover:text-foreground hover:underline"
                      >
                        {intervenant.phone}
                      </a>
                    </div>
                  )}

                  {intervenant.biographie && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-2 leading-relaxed">
                      {intervenant.biographie}
                    </p>
                  )}

                  {intervenant.specialites &&
                    intervenant.specialites.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1.5">
                        {intervenant.specialites.map((s: string) => (
                          <Badge
                            key={s}
                            variant="secondary"
                            className="text-[10px] font-normal"
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail / Full profile dialog */}
      <Dialog
        open={detailMode !== null}
        onOpenChange={() => setDetailMode(null)}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailMode && (
            <>
              <DialogHeader>
                <DialogTitle className="sr-only">
                  Profil intervenant
                </DialogTitle>
              </DialogHeader>

              {/* Profile header */}
              <div className="flex items-start gap-5 pb-4 border-b">
                <div className="relative group/avatar">
                  <ShadcnAvatar className="h-24 w-24 border-2 border-border shadow">
                    <AvatarImage
                      src={detailMode.avatar?.src ?? undefined}
                    />
                    <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
                      {detailMode.first_name?.charAt(0)?.toUpperCase()}
                      {detailMode.last_name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </ShadcnAvatar>
                  <button
                    type="button"
                    className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Camera className="h-6 w-6 text-white" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && detailMode) {
                        handleAvatarUpload(detailMode, file);
                      }
                      e.target.value = "";
                    }}
                  />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">
                    {detailMode.first_name} {detailMode.last_name}
                  </h2>
                  {detailMode.statut && (
                    <Badge
                      variant="outline"
                      className={`mt-1 ${STATUT_COLORS[detailMode.statut] ?? ""}`}
                    >
                      {detailMode.statut}
                    </Badge>
                  )}
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDetailMode(null);
                        openEdit(detailMode);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                      Modifier
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive border-destructive/30"
                      onClick={() => handleDelete(detailMode)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Supprimer
                    </Button>
                  </div>
                </div>
              </div>

              {/* Contact details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Coordonnées
                  </h3>
                  {detailMode.email ? (
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                        <Mail className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <a
                          href={`mailto:${detailMode.email}`}
                          className="text-sm hover:underline text-foreground"
                        >
                          {detailMode.email}
                        </a>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Aucun email
                    </p>
                  )}
                  {detailMode.phone ? (
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                        <Phone className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Téléphone
                        </p>
                        <a
                          href={`tel:${detailMode.phone}`}
                          className="text-sm hover:underline text-foreground"
                        >
                          {detailMode.phone}
                        </a>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Aucun téléphone
                    </p>
                  )}
                  {detailMode.date_ajout && (
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                        <Calendar className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Ajouté le
                        </p>
                        <p className="text-sm">
                          {new Date(detailMode.date_ajout).toLocaleDateString(
                            "fr-FR",
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Spécialités
                  </h3>
                  {detailMode.specialites &&
                  detailMode.specialites.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {detailMode.specialites.map((s: string) => (
                        <Badge key={s} variant="secondary" className="text-xs">
                          <Award className="h-3 w-3 mr-1" />
                          {s}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Aucune spécialité renseignée
                    </p>
                  )}
                </div>
              </div>

              {/* Bio */}
              {detailMode.biographie && (
                <div className="pt-4 border-t space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    Biographie
                  </h3>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {detailMode.biographie}
                  </p>
                </div>
              )}

              {/* Notes */}
              {detailMode.notes && (
                <div className="pt-4 border-t space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Notes internes
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded-md p-3">
                    {detailMode.notes}
                  </p>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogMode !== null}
        onOpenChange={() => setDialogMode(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create"
                ? "Nouvel intervenant"
                : "Modifier l'intervenant"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Prénom</Label>
                <Input
                  value={form.first_name}
                  onChange={(e) => updateField("first_name", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nom</Label>
                <Input
                  value={form.last_name}
                  onChange={(e) => updateField("last_name", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Téléphone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Statut</Label>
              <Select
                value={form.statut}
                onValueChange={(v) => updateField("statut", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statutChoices.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Biographie</Label>
              <Textarea
                value={form.biographie}
                onChange={(e) => updateField("biographie", e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Spécialités (séparées par des virgules)</Label>
              <Input
                value={form.specialites}
                onChange={(e) => updateField("specialites", e.target.value)}
                placeholder="Cinéma, Doublage, Mixage"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDialogMode(null)}>
              Annuler
            </Button>
            <Button onClick={handleSave}>
              {dialogMode === "create" ? "Créer" : "Enregistrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden file input for card avatar uploads */}
    </>
  );
};

export default IntervenantList;
