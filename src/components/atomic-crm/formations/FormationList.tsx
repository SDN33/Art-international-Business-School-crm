import { useListContext, useUpdate, useNotify, useRefresh } from "ra-core";
import { useRef } from "react";
import { matchPath, useLocation } from "react-router";
import { List } from "@/components/admin/list";
import { CreateButton } from "@/components/admin/create-button";
import { SearchInput } from "@/components/admin/search-input";
import { SelectInput } from "@/components/admin/select-input";
import { FilterButton } from "@/components/admin/filter-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TopToolbar } from "../layout/TopToolbar";
import { useNavigate } from "react-router";
import { FormationCreate } from "./FormationCreate";
import { FormationEdit } from "./FormationEdit";
import { domaineColors } from "./constants";
import { Clock, MapPin, Euro, GraduationCap, Camera } from "lucide-react";
import { getSupabaseClient } from "../providers/supabase/supabase";

const domaineChoices = [
  { id: "Cinéma", name: "Cinéma" },
  { id: "Production", name: "Production" },
  { id: "Doublage", name: "Doublage" },
  { id: "Musique", name: "Musique" },
  { id: "Théâtre", name: "Théâtre" },
];

const statutChoices = [
  { id: "Active", name: "Active" },
  { id: "Archivée", name: "Archivée" },
  { id: "Brouillon", name: "Brouillon" },
];

const formationFilters = [
  <SearchInput source="nom@ilike" alwaysOn />,
  <SelectInput
    source="domaine_artistique"
    choices={domaineChoices}
    label="Domaine"
  />,
  <SelectInput
    source="statut"
    choices={statutChoices}
    label="Statut"
  />,
];

const FormationList = () => (
  <List
    title="Formations catalogue"
    perPage={50}
    sort={{ field: "ordre", order: "ASC" }}
    filters={formationFilters}
    actions={
      <TopToolbar>
        <FilterButton />
        <CreateButton label="Ajouter une formation" />
      </TopToolbar>
    }
  >
    <FormationLayout />
  </List>
);

const FormationLayout = () => {
  const location = useLocation();
  const matchCreate = matchPath("/formations/create", location.pathname);
  const matchEdit = matchPath("/formations/:id", location.pathname);
  const matchShow = matchPath("/formations/:id/show", location.pathname);

  return (
    <>
      <FormationGrid />
      <FormationCreate open={!!matchCreate} />
      <FormationEdit
        open={!!matchEdit && !matchCreate && !matchShow}
        id={matchEdit?.params.id}
      />
    </>
  );
};

const FormationGrid = () => {
  const { data, isPending } = useListContext();
  const navigate = useNavigate();
  const notify = useNotify();
  const refresh = useRefresh();
  const [update] = useUpdate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<number | null>(null);

  const handleImageUpload = async (file: File, formationId: number) => {
    try {
      const supabase = getSupabaseClient();
      const ext = file.name.split(".").pop();
      const path = `formations/${formationId}/image.${ext}`;
      await supabase.storage.from("attachments").remove([path]);
      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const {
        data: { publicUrl },
      } = supabase.storage.from("attachments").getPublicUrl(path);
      update(
        "formations",
        { id: formationId, data: { image: { src: publicUrl } }, previousData: { id: formationId } },
        {
          onSuccess: () => { notify("Image ajoutée", { type: "success" }); refresh(); },
          onError: () => notify("Erreur lors de la mise à jour", { type: "error" }),
        },
      );
    } catch {
      notify("Erreur lors de l'upload", { type: "error" });
    }
  };

  if (isPending)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">
          Chargement...
        </div>
      </div>
    );
  if (!data?.length)
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <GraduationCap className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">Aucune formation</p>
      </div>
    );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {data.map((formation: any) => (
        <Card
          key={formation.id}
          className="cursor-pointer group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden border-0 shadow-sm"
          onClick={() => navigate(`/formations/${formation.id}/show`)}
        >
          {/* Image hero ou placeholder coloré */}
          <div className="relative h-36 overflow-hidden bg-muted">
            {formation.image?.src ? (
              <img
                src={formation.image.src}
                alt={formation.nom}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-linear-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                <GraduationCap className="h-10 w-10 text-primary/20" />
              </div>
            )}
            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
            {/* Quick image upload button */}
            {!formation.image?.src && (
              <button
                className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 rounded-md bg-white/90 hover:bg-white text-xs font-medium text-gray-700 shadow-sm transition-colors z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  uploadTargetRef.current = formation.id;
                  fileInputRef.current?.click();
                }}
              >
                <Camera className="h-3 w-3" />
                Photo
              </button>
            )}
            <div className="absolute top-3 right-3 flex gap-1.5">
              {formation.statut && (
                <Badge
                  variant={
                    formation.statut === "Active" ? "default" : "secondary"
                  }
                  className="text-[10px] px-2 py-0.5 shadow-sm"
                >
                  {formation.statut}
                </Badge>
              )}
            </div>
            {formation.domaine_artistique && (
              <div className="absolute bottom-3 left-3">
                <span
                  className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm backdrop-blur-sm ${domaineColors[formation.domaine_artistique] || "bg-gray-100 text-gray-800"}`}
                >
                  {formation.domaine_artistique}
                </span>
              </div>
            )}
          </div>

          <CardContent className="p-4 space-y-2">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
              {formation.nom}
            </h3>
            {formation.sous_titre && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {formation.sous_titre}
              </p>
            )}

            {/* Metrics row */}
            <div className="flex items-center gap-3 pt-1.5 border-t border-border/50">
              {formation.duree_jours && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formation.duree_jours}j
                </span>
              )}
              {formation.lieu_principal && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {formation.lieu_principal}
                </span>
              )}
              {formation.prix_catalogue && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-foreground ml-auto">
                  <Euro className="h-3 w-3" />
                  {Number(formation.prix_catalogue).toLocaleString("fr-FR")}
                </span>
              )}
            </div>

            {formation.accroche && (
              <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                {formation.accroche}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
      {/* Hidden file input for quick image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadTargetRef.current != null) {
            handleImageUpload(file, uploadTargetRef.current);
          }
          e.target.value = "";
          uploadTargetRef.current = null;
        }}
      />
    </div>
  );
};

export default FormationList;
