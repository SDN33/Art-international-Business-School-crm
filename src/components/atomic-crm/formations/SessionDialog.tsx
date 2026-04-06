import { useState } from "react";
import {
  useCreate,
  useUpdate,
  useDelete,
  useNotify,
  useRefresh,
  useGetList,
} from "ra-core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  type Session,
  type SessionFormData,
  statusChoices,
  emptySessionForm,
} from "./constants";

export const useSessionDialog = (defaultFormationId?: number) => {
  const [dialogMode, setDialogMode] = useState<null | "create" | "edit">(null);
  const [selected, setSelected] = useState<Session | null>(null);
  const [form, setForm] = useState<SessionFormData>(emptySessionForm);

  const notify = useNotify();
  const refresh = useRefresh();
  const [create] = useCreate();
  const [update] = useUpdate();
  const [deleteOne] = useDelete();

  const openCreate = () => {
    setForm({
      ...emptySessionForm,
      formation_id: defaultFormationId ? String(defaultFormationId) : "",
    });
    setSelected(null);
    setDialogMode("create");
  };

  const openEdit = (item: Session) => {
    setSelected(item);
    setForm({
      session_name: item.session_name ?? "",
      formation_id: item.formation_id?.toString() ?? "",
      start_date: item.start_date?.slice(0, 10) ?? "",
      end_date: item.end_date?.slice(0, 10) ?? "",
      location: item.location ?? "",
      capacity: item.capacity?.toString() ?? "",
      status: item.status ?? "Ouverte",
      notes: item.notes ?? "",
    });
    setDialogMode("edit");
  };

  const handleSave = () => {
    const payload: Record<string, unknown> = {
      session_name: form.session_name || null,
      formation_id: form.formation_id ? Number(form.formation_id) : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      location: form.location || null,
      capacity: form.capacity ? Number(form.capacity) : null,
      status: form.status || null,
      notes: form.notes || null,
    };
    if (dialogMode === "create") {
      create(
        "training_sessions",
        { data: payload },
        {
          onSuccess: () => {
            notify("Session créée", { type: "success" });
            setDialogMode(null);
            refresh();
          },
          onError: () =>
            notify("Erreur lors de la création", { type: "error" }),
        },
      );
    } else if (dialogMode === "edit" && selected) {
      update(
        "training_sessions",
        { id: selected.id, data: payload, previousData: selected },
        {
          onSuccess: () => {
            notify("Session mise à jour", { type: "success" });
            setDialogMode(null);
            refresh();
          },
          onError: () =>
            notify("Erreur lors de la mise à jour", { type: "error" }),
        },
      );
    }
  };

  const handleDelete = (item: Session) => {
    if (!confirm("Supprimer cette session ?")) return;
    deleteOne(
      "training_sessions",
      { id: item.id, previousData: item },
      {
        onSuccess: () => {
          notify("Session supprimée", { type: "success" });
          refresh();
        },
        onError: () =>
          notify("Erreur lors de la suppression", { type: "error" }),
      },
    );
  };

  const updateField = (field: keyof SessionFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return {
    dialogMode,
    setDialogMode,
    form,
    selected,
    openCreate,
    openEdit,
    handleSave,
    handleDelete,
    updateField,
  };
};

export const SessionDialog = ({
  dialogMode,
  form,
  updateField,
  handleSave,
  onClose,
  hideFormationField,
}: {
  dialogMode: "create" | "edit" | null;
  form: SessionFormData;
  updateField: (field: keyof SessionFormData, value: string) => void;
  handleSave: () => void;
  onClose: () => void;
  hideFormationField?: boolean;
}) => {
  const { data: formations } = useGetList("formations", {
    pagination: { page: 1, perPage: 200 },
    sort: { field: "nom", order: "ASC" },
  });

  return (
    <Dialog open={dialogMode !== null} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {dialogMode === "create"
              ? "Nouvelle session"
              : "Modifier la session"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Nom de la session
            </Label>
            <Input
              value={form.session_name}
              onChange={(e) => updateField("session_name", e.target.value)}
              placeholder="Ex: Acteur Leader — Promotion Avril 2026"
              className="h-9"
            />
          </div>
          {!hideFormationField && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Formation associée
              </Label>
              <Select
                value={form.formation_id}
                onValueChange={(v) => updateField("formation_id", v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Sélectionner une formation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucune</SelectItem>
                  {formations?.map((f: any) => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {f.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Date de début
              </Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => updateField("start_date", e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Date de fin
              </Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => updateField("end_date", e.target.value)}
                className="h-9"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Lieu
              </Label>
              <Input
                value={form.location}
                onChange={(e) => updateField("location", e.target.value)}
                placeholder="Paris"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Capacité
              </Label>
              <Input
                type="number"
                value={form.capacity}
                onChange={(e) => updateField("capacity", e.target.value)}
                placeholder="15"
                className="h-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Statut
            </Label>
            <Select
              value={form.status}
              onValueChange={(v) => updateField("status", v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusChoices.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Notes
            </Label>
            <Textarea
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              rows={2}
              placeholder="Notes internes..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button size="sm" onClick={handleSave}>
            {dialogMode === "create" ? "Créer" : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
