import { useState, useRef } from "react";
import { TextInput } from "@/components/admin/text-input";
import { NumberInput } from "@/components/admin/number-input";
import { SelectInput } from "@/components/admin/select-input";
import { required, useRecordContext, useUpdate, useNotify, useRefresh } from "ra-core";
import { Label } from "@/components/ui/label";
import { Camera, ImageIcon, X } from "lucide-react";
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

const formatChoices = [
  { id: "Présentiel", name: "Présentiel" },
  { id: "En ligne", name: "En ligne" },
  { id: "Hybride", name: "Hybride" },
];

export const FormationInputs = () => (
  <div className="flex flex-col gap-4">
    <FormationImageUpload />
    <TextInput source="nom" validate={required()} helperText={false} />
    <TextInput source="sous_titre" helperText={false} />
    <TextInput
      source="description"
      multiline
      rows={3}
      helperText={false}
    />
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <SelectInput
        source="domaine_artistique"
        label="Domaine artistique"
        choices={domaineChoices}
        helperText={false}
      />
      <SelectInput
        source="statut"
        choices={statutChoices}
        defaultValue="Brouillon"
        helperText={false}
      />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <NumberInput
        source="duree_jours"
        label="Durée (jours)"
        helperText={false}
      />
      <NumberInput
        source="prix_catalogue"
        label="Prix catalogue (€)"
        helperText={false}
      />
      <NumberInput source="ordre" label="Ordre d'affichage" helperText={false} />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <TextInput
        source="lieu_principal"
        label="Lieu principal"
        helperText={false}
      />
      <SelectInput
        source="format"
        choices={formatChoices}
        helperText={false}
      />
    </div>
    <TextInput source="accroche" multiline rows={2} helperText={false} />
    <TextInput
      source="objectifs"
      multiline
      rows={2}
      helperText={false}
    />
    <TextInput source="tarif" helperText={false} />
    <TextInput source="duree_texte" label="Durée (texte)" helperText={false} />
    <TextInput source="date_texte" label="Dates (texte)" helperText={false} />
  </div>
);

const FormationImageUpload = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const refresh = useRefresh();
  const [update] = useUpdate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const imageUrl = record?.image?.src;

  const handleUpload = async (file: File) => {
    if (!record?.id) {
      notify("Enregistrez d'abord la formation avant d'ajouter une image", { type: "warning" });
      return;
    }
    setUploading(true);
    try {
      const supabase = getSupabaseClient();
      const ext = file.name.split(".").pop();
      const path = `formations/${record.id}/image.${ext}`;

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
        {
          id: record.id,
          data: { image: { src: publicUrl } },
          previousData: record,
        },
        {
          onSuccess: () => {
            notify("Image mise à jour", { type: "success" });
            refresh();
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

  const handleRemove = () => {
    if (!record?.id) return;
    update(
      "formations",
      {
        id: record.id,
        data: { image: null },
        previousData: record,
      },
      {
        onSuccess: () => {
          notify("Image supprimée", { type: "success" });
          refresh();
        },
        onError: () =>
          notify("Erreur lors de la suppression", { type: "error" }),
      },
    );
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">Image de la formation</Label>
      <div
        className="relative group rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors overflow-hidden cursor-pointer"
        style={{ height: 160 }}
        onClick={() => fileInputRef.current?.click()}
      >
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt="Formation"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <div className="flex items-center gap-1 text-white text-xs font-medium">
                <Camera className="h-4 w-4" /> Changer
              </div>
              <div
                className="flex items-center gap-1 text-white text-xs font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
              >
                <X className="h-4 w-4" /> Supprimer
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <ImageIcon className="h-8 w-8" />
            <span className="text-xs">
              {uploading
                ? "Upload en cours..."
                : record?.id
                  ? "Cliquer pour ajouter une image"
                  : "Enregistrez d'abord pour ajouter une image"}
            </span>
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
};
