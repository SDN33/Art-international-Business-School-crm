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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckSquare, Clock, CheckCircle2, Calendar, Plus, Pencil, Trash2, RotateCcw } from "lucide-react";

type Task = {
  id: number;
  text: string | null;
  type: string | null;
  due_date: string | null;
  done_date: string | null;
  sales_id: number | null;
  contact_id: number;
};

type Sale = { id: number; first_name: string; last_name: string };
type Contact = { id: number; first_name: string; last_name: string };

const TYPE_OPTIONS = ["Todo", "Call", "Email", "Follow-up"];

const COLUMN_CONFIG = [
  {
    key: "todo",
    label: "À faire",
    bgColor: "bg-blue-50",
    headerBg: "bg-blue-100",
    headerText: "text-blue-800",
    iconColor: "text-blue-500",
    Icon: CheckSquare,
  },
  {
    key: "done",
    label: "Terminé",
    bgColor: "bg-green-50",
    headerBg: "bg-green-100",
    headerText: "text-green-800",
    iconColor: "text-green-500",
    Icon: CheckCircle2,
  },
];

const TYPE_COLORS: Record<string, string> = {
  Todo: "bg-purple-100 text-purple-700",
  Call: "bg-blue-100 text-blue-700",
  Email: "bg-indigo-100 text-indigo-700",
  "Follow-up": "bg-amber-100 text-amber-700",
  None: "bg-gray-100 text-gray-600",
};

type FormData = {
  text: string;
  type: string;
  due_date: string;
  contact_id: string;
  sales_id: string;
};

const emptyForm: FormData = {
  text: "",
  type: "",
  due_date: "",
  contact_id: "",
  sales_id: "",
};

export const TasksKanbanPage = () => {
  const [dialogMode, setDialogMode] = useState<null | "create" | "edit">(null);
  const [selected, setSelected] = useState<Task | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  const notify = useNotify();
  const refresh = useRefresh();
  const [create] = useCreate();
  const [update] = useUpdate();
  const [deleteOne] = useDelete();

  const { data: tasks, isLoading } = useGetList<Task>("tasks", {
    pagination: { page: 1, perPage: 500 },
    sort: { field: "due_date", order: "ASC" },
  });

  const { data: sales } = useGetList<Sale>("sales", {
    pagination: { page: 1, perPage: 100 },
    sort: { field: "first_name", order: "ASC" },
  });

  const { data: contacts } = useGetList<Contact>("contacts", {
    pagination: { page: 1, perPage: 500 },
    sort: { field: "first_name", order: "ASC" },
  });

  const salesMap = Object.fromEntries(
    (sales ?? []).map((s) => [s.id, `${s.first_name} ${s.last_name}`])
  );
  const contactMap = Object.fromEntries(
    (contacts ?? []).map((c) => [c.id, `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim()])
  );

  const todoTasks = (tasks ?? []).filter((t) => !t.done_date);
  const doneTasks = (tasks ?? []).filter((t) => !!t.done_date);
  const columns: Record<string, Task[]> = { todo: todoTasks, done: doneTasks };

  const isOverdue = (task: Task) => {
    if (task.done_date || !task.due_date) return false;
    return new Date(task.due_date) < new Date();
  };

  const openCreate = () => {
    setForm(emptyForm);
    setSelected(null);
    setDialogMode("create");
  };

  const openEdit = (task: Task) => {
    setSelected(task);
    setForm({
      text: task.text ?? "",
      type: task.type ?? "",
      due_date: task.due_date ?? "",
      contact_id: task.contact_id?.toString() ?? "",
      sales_id: task.sales_id?.toString() ?? "",
    });
    setDialogMode("edit");
  };

  const handleSave = () => {
    const data: Record<string, unknown> = {
      text: form.text || null,
      type: form.type || null,
      due_date: form.due_date || null,
      contact_id: form.contact_id ? Number(form.contact_id) : null,
      sales_id: form.sales_id ? Number(form.sales_id) : null,
    };
    if (dialogMode === "create") {
      create("tasks", { data }, {
        onSuccess: () => { notify("Tâche créée", { type: "success" }); setDialogMode(null); refresh(); },
        onError: () => notify("Erreur lors de la création", { type: "error" }),
      });
    } else if (dialogMode === "edit" && selected) {
      update("tasks", { id: selected.id, data, previousData: selected }, {
        onSuccess: () => { notify("Tâche mise à jour", { type: "success" }); setDialogMode(null); refresh(); },
        onError: () => notify("Erreur lors de la mise à jour", { type: "error" }),
      });
    }
  };

  const handleDelete = (task: Task) => {
    if (!confirm("Supprimer cette tâche ?")) return;
    deleteOne("tasks", { id: task.id, previousData: task }, {
      onSuccess: () => { notify("Tâche supprimée", { type: "success" }); refresh(); },
      onError: () => notify("Erreur lors de la suppression", { type: "error" }),
    });
  };

  const toggleDone = (task: Task) => {
    const data = task.done_date
      ? { done_date: null }
      : { done_date: new Date().toISOString() };
    update("tasks", { id: task.id, data, previousData: task }, {
      onSuccess: () => {
        notify(task.done_date ? "Tâche rouverte" : "Tâche terminée", { type: "success" });
        refresh();
      },
      onError: () => notify("Erreur", { type: "error" }),
    });
  };

  const updateField = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CheckSquare className="h-6 w-6" />
            Tâches
          </h1>
          <p className="text-muted-foreground text-sm">
            Visualisez et gérez les tâches commerciales.
          </p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle tâche
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          Chargement…
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMN_CONFIG.map((col) => {
            const colTasks = columns[col.key];
            return (
              <div key={col.key} className="shrink-0 w-80 flex flex-col gap-2">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${col.headerBg}`}>
                  <col.Icon className={`h-4 w-4 ${col.iconColor}`} />
                  <span className={`font-semibold text-sm ${col.headerText}`}>{col.label}</span>
                  <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${col.headerBg} ${col.headerText}`}>
                    {colTasks.length}
                  </span>
                </div>
                <div className={`flex flex-col gap-2 min-h-20 rounded-lg p-2 ${col.bgColor}`}>
                  {colTasks.length === 0 ? (
                    <div className="text-center text-xs text-muted-foreground py-6">Aucune tâche</div>
                  ) : (
                    colTasks.map((task) => {
                      const overdue = isOverdue(task);
                      return (
                        <div
                          key={task.id}
                          className={`bg-white rounded-lg p-3 shadow-sm border ${overdue ? "border-red-200" : "border-border"} space-y-2`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-sm font-medium leading-snug flex-1">
                              {task.text ?? "(sans titre)"}
                            </div>
                            <div className="flex gap-0.5 shrink-0">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleDone(task)} title={task.done_date ? "Rouvrir" : "Terminer"}>
                                {task.done_date ? <RotateCcw className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3 text-green-500" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(task)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(task)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          {task.type && (
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[task.type] ?? "bg-gray-100 text-gray-700"}`}>
                              {task.type}
                            </span>
                          )}
                          {task.due_date && (
                            <div className={`flex items-center gap-1 text-xs ${overdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(task.due_date).toLocaleDateString("fr-FR")}</span>
                              {overdue && <span className="text-red-500 font-semibold">(En retard)</span>}
                            </div>
                          )}
                          {task.done_date && (
                            <div className="flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Terminé le {new Date(task.done_date).toLocaleDateString("fr-FR")}</span>
                            </div>
                          )}
                          {task.sales_id && salesMap[task.sales_id] && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>Responsable: {salesMap[task.sales_id]}</span>
                            </div>
                          )}
                          {task.contact_id && (
                            <div className="text-xs">
                              <Link to={`/contacts/${task.contact_id}/show`} className="text-primary hover:underline">
                                {contactMap[task.contact_id] ?? `Contact #${task.contact_id}`}
                              </Link>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={() => setDialogMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Nouvelle tâche" : "Modifier la tâche"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.text} onChange={(e) => updateField("text", e.target.value)} placeholder="Description de la tâche..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => updateField("type", v)}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date d'échéance</Label>
                <Input type="date" value={form.due_date} onChange={(e) => updateField("due_date", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Contact ID</Label>
                <Input type="number" value={form.contact_id} onChange={(e) => updateField("contact_id", e.target.value)} placeholder="ID du contact" />
              </div>
              <div className="space-y-1.5">
                <Label>Responsable</Label>
                <Select value={form.sales_id} onValueChange={(v) => updateField("sales_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    {(sales ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.first_name} {s.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
