import { useState } from "react";
import { useDataProvider, useGetList, useNotify } from "ra-core";
import { GripVertical, Plus, Trash2, Settings2 } from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type OnDragEndResponder,
} from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toSlug } from "@/lib/toSlug";
import {
  useConfigurationContext,
  useConfigurationUpdater,
} from "../root/ConfigurationContext";

type Stage = { value: string; label: string };

export const ManageColumnsDialog = () => {
  const config = useConfigurationContext();
  const updateConfiguration = useConfigurationUpdater();
  const dataProvider = useDataProvider();
  const notify = useNotify();

  const [open, setOpen] = useState(false);
  const [stages, setStages] = useState<Stage[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: deals } = useGetList("deals", {
    pagination: { page: 1, perPage: 1000 },
  });

  const usedStages = new Set(deals?.map((d) => d.stage) ?? []);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setStages([...config.dealStages]);
      setNewLabel("");
    }
    setOpen(isOpen);
  };

  const handleAdd = () => {
    const label = newLabel.trim();
    if (!label) return;
    const slug = toSlug(label);
    if (stages.some((s) => s.value === slug)) {
      notify("Cette colonne existe déjà", { type: "warning" });
      return;
    }
    setStages([...stages, { value: slug, label }]);
    setNewLabel("");
  };

  const handleRemove = (index: number) => {
    const stage = stages[index];
    if (usedStages.has(stage.value)) {
      notify(
        `Impossible de supprimer « ${stage.label} » — des deals utilisent cette colonne`,
        { type: "warning" },
      );
      return;
    }
    setStages(stages.filter((_, i) => i !== index));
  };

  const handleRename = (index: number, label: string) => {
    const updated = [...stages];
    updated[index] = { ...updated[index], label };
    setStages(updated);
  };

  const onDragEnd: OnDragEndResponder = (result) => {
    if (!result.destination) return;
    const items = [...stages];
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setStages(items);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const newConfig = {
        ...config,
        dealStages: stages.map((s) => ({
          value: s.value || toSlug(s.label),
          label: s.label,
        })),
      };
      await dataProvider.update("configuration", {
        id: 1,
        data: { config: newConfig },
        previousData: { id: 1 },
      });
      updateConfiguration(newConfig);
      notify("Colonnes mises à jour", { type: "success" });
      setOpen(false);
    } catch {
      notify("Erreur lors de la sauvegarde", { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Settings2 className="h-4 w-4" />
          Colonnes
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Gérer les colonnes du pipeline</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Glissez pour réorganiser, renommez directement, ou ajoutez/supprimez
          des colonnes.
        </p>

        {/* Column list with drag-and-drop */}
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="column-list">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-1 overflow-y-auto flex-1 min-h-0 pr-1"
              >
                {stages.map((stage, index) => (
                  <Draggable
                    key={stage.value}
                    draggableId={stage.value}
                    index={index}
                  >
                    {(dragProvided, snapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        className={`flex items-center gap-2 p-2 rounded-md border bg-background ${
                          snapshot.isDragging ? "shadow-lg ring-2 ring-primary/20" : ""
                        }`}
                      >
                        <div
                          {...dragProvided.dragHandleProps}
                          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                        >
                          <GripVertical className="h-4 w-4" />
                        </div>
                        <Input
                          value={stage.label}
                          onChange={(e) => handleRename(index, e.target.value)}
                          className="h-8 text-sm flex-1"
                        />
                        {usedStages.has(stage.value) ? (
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            utilisée
                          </span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                            onClick={() => handleRemove(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {/* Add new column */}
        <div className="flex gap-2 pt-2 border-t">
          <Input
            placeholder="Nouvelle colonne..."
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="h-9 text-sm"
          />
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 h-9"
            onClick={handleAdd}
            disabled={!newLabel.trim()}
          >
            <Plus className="h-4 w-4 mr-1" />
            Ajouter
          </Button>
        </div>

        {/* Save/Cancel */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving || stages.length === 0}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
