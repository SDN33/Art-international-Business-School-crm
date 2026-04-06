import { useState, useRef, useCallback } from "react";
import {
  useGetList,
  useCreate,
  useUpdate,
  useDelete,
  useNotify,
  useRefresh,
} from "ra-core";
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
import {
  Search,
  FileText,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Share2,
  Check,
  Loader2,
  Download,
  File,
} from "lucide-react";
import type { Document } from "../types";
import { getSupabaseClient } from "../providers/supabase/supabase";

const TYPE_OPTIONS = [
  { value: "dossier-afdas", label: "Dossier AFDAS" },
  { value: "cv", label: "CV" },
  { value: "lettre-motivation", label: "Lettre de motivation" },
  { value: "piece-identite", label: "Pièce d'identité" },
  { value: "attestation", label: "Attestation" },
  { value: "contrat", label: "Contrat" },
  { value: "facture", label: "Facture" },
  { value: "convention", label: "Convention" },
  { value: "autre", label: "Autre" },
];

const STATUT_OPTIONS = [
  { value: "en-attente", label: "En attente" },
  { value: "valide", label: "Validé" },
  { value: "refuse", label: "Refusé" },
  { value: "expire", label: "Expiré" },
];

const STATUT_COLORS: Record<string, string> = {
  "en-attente": "bg-yellow-100 text-yellow-700",
  valide: "bg-green-100 text-green-700",
  refuse: "bg-red-100 text-red-700",
  expire: "bg-gray-100 text-gray-700",
};

const FILE_ICONS: Record<string, string> = {
  pdf: "📄",
  doc: "📝",
  docx: "📝",
  xls: "📊",
  xlsx: "📊",
  jpg: "🖼️",
  jpeg: "🖼️",
  png: "🖼️",
  gif: "🖼️",
};

async function uploadFileToStorage(
  file: globalThis.File,
  docId?: number
): Promise<{ url: string; fileName: string }> {
  const supabase = getSupabaseClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  const prefix = docId ? `documents/${docId}` : `documents/tmp_${timestamp}`;
  const path = `${prefix}/${timestamp}_${safeName}`;

  if (docId) {
    const { data: existingFiles } = await supabase.storage
      .from("attachments")
      .list(`documents/${docId}`);
    if (existingFiles?.length) {
      await supabase.storage
        .from("attachments")
        .remove(existingFiles.map((f) => `documents/${docId}/${f.name}`));
    }
  }

  const { error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from("attachments").getPublicUrl(path);

  return { url: publicUrl, fileName: file.name };
}

type FormData = {
  title: string;
  type_document: string;
  file_url: string;
  file_name: string;
  statut: string;
  notes: string;
  contact_id: string;
};

const emptyForm: FormData = {
  title: "",
  type_document: "autre",
  file_url: "",
  file_name: "",
  statut: "en-attente",
  notes: "",
  contact_id: "",
};

export const DocumentList = () => {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statutFilter, setStatutFilter] = useState("all");
  const [dialogMode, setDialogMode] = useState<null | "create" | "edit">(null);
  const [selected, setSelected] = useState<Document | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const notify = useNotify();
  const refresh = useRefresh();
  const [create] = useCreate();
  const [update] = useUpdate();
  const [deleteOne] = useDelete();

  const buildFilter = () => {
    const f: Record<string, string> = {};
    if (search) f["title@ilike"] = `%${search}%`;
    if (typeFilter !== "all") f["type_document@eq"] = typeFilter;
    if (statutFilter !== "all") f["statut@eq"] = statutFilter;
    return f;
  };

  const { data: documents, isLoading } = useGetList<Document>("documents", {
    pagination: { page: 1, perPage: 200 },
    sort: { field: "created_at", order: "DESC" },
    filter: buildFilter(),
  });

  // Fetch contacts for display
  const { data: contacts } = useGetList("contacts", {
    pagination: { page: 1, perPage: 1000 },
    sort: { field: "last_name", order: "ASC" },
  });

  const contactMap = new Map(
    (contacts ?? []).map((c) => [
      c.id,
      `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim(),
    ])
  );

  const openCreate = () => {
    setForm(emptyForm);
    setSelected(null);
    setDialogMode("create");
  };

  const openEdit = (item: Document) => {
    setSelected(item);
    setForm({
      title: item.title ?? "",
      type_document: item.type_document ?? "autre",
      file_url: item.file_url ?? "",
      file_name: item.file_name ?? "",
      statut: item.statut ?? "en-attente",
      notes: item.notes ?? "",
      contact_id: item.contact_id?.toString() ?? "",
    });
    setDialogMode("edit");
  };

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const docId =
          dialogMode === "edit" && selected ? Number(selected.id) : undefined;
        const { url, fileName } = await uploadFileToStorage(file, docId);
        setForm((prev) => ({
          ...prev,
          file_url: url,
          file_name: fileName,
          title: prev.title || fileName.replace(/\.[^.]+$/, ""),
        }));
        notify("Fichier uploadé", { type: "success" });
      } catch {
        notify("Erreur lors de l'upload du fichier", { type: "error" });
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [dialogMode, selected, notify]
  );

  const handleSave = () => {
    const data: Record<string, unknown> = {
      title: form.title || null,
      type_document: form.type_document || "autre",
      file_url: form.file_url || null,
      file_name: form.file_name || null,
      statut: form.statut || "en-attente",
      notes: form.notes || null,
      contact_id: form.contact_id ? Number(form.contact_id) : null,
    };
    if (dialogMode === "create") {
      create(
        "documents",
        { data },
        {
          onSuccess: () => {
            notify("Document créé", { type: "success" });
            setDialogMode(null);
            refresh();
          },
          onError: () =>
            notify("Erreur lors de la création", { type: "error" }),
        }
      );
    } else if (dialogMode === "edit" && selected) {
      update(
        "documents",
        { id: selected.id, data, previousData: selected },
        {
          onSuccess: () => {
            notify("Document mis à jour", { type: "success" });
            setDialogMode(null);
            refresh();
          },
          onError: () =>
            notify("Erreur lors de la mise à jour", { type: "error" }),
        }
      );
    }
  };

  const handleDelete = (item: Document) => {
    if (!confirm("Supprimer ce document ?")) return;
    if (item.file_url) {
      try {
        const supabase = getSupabaseClient();
        const url = new URL(item.file_url);
        const pathMatch = url.pathname.match(
          /\/storage\/v1\/object\/public\/attachments\/(.+)/
        );
        if (pathMatch) {
          supabase.storage
            .from("attachments")
            .remove([decodeURIComponent(pathMatch[1])]);
        }
      } catch {
        // Non-critical: file deletion from storage failed
      }
    }
    deleteOne(
      "documents",
      { id: item.id, previousData: item },
      {
        onSuccess: () => {
          notify("Document supprimé", { type: "success" });
          refresh();
        },
        onError: () =>
          notify("Erreur lors de la suppression", { type: "error" }),
      }
    );
  };

  const handleShare = async (doc: Document) => {
    if (!doc.file_url) {
      notify("Aucun fichier à partager", { type: "warning" });
      return;
    }
    try {
      await navigator.clipboard.writeText(doc.file_url);
      setCopiedId(Number(doc.id));
      notify("Lien copié dans le presse-papiers", { type: "success" });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      window.open(doc.file_url, "_blank");
    }
  };

  const updateField = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const getTypeLabel = (value: string) =>
    TYPE_OPTIONS.find((t) => t.value === value)?.label ?? value;

  const getStatutLabel = (value: string) =>
    STATUT_OPTIONS.find((s) => s.value === value)?.label ?? value;

  const getFileIcon = (fileName: string | null) => {
    if (!fileName) return "📎";
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    return FILE_ICONS[ext] ?? "📎";
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Documents
          </h1>
          <p className="text-muted-foreground text-sm">
            Gestion des documents des candidats : dossiers AFDAS, CV,
            attestations, contrats…
          </p>
        </div>
        <div className="flex items-center gap-4">
          {documents && documents.length > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {documents.length}
              </div>
              <div className="text-xs text-muted-foreground">
                document{documents.length > 1 ? "s" : ""}
              </div>
            </div>
          )}
          <Button onClick={openCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nouveau document
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par titre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {TYPE_OPTIONS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statutFilter} onValueChange={setStatutFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {STATUT_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Fichier</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[140px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Chargement…
                </TableCell>
              </TableRow>
            ) : !documents || documents.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  Aucun document trouvé
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span>{getFileIcon(doc.file_name)}</span>
                      {doc.title}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                      {getTypeLabel(doc.type_document)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {doc.contact_id ? (
                      <Link
                        to={`/contacts/${doc.contact_id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {contactMap.get(doc.contact_id) ?? `#${doc.contact_id}`}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${STATUT_COLORS[doc.statut] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {getStatutLabel(doc.statut)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {doc.file_url ? (
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                      >
                        <Download className="h-3 w-3" />
                        {doc.file_name || "Fichier"}
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {doc.created_at
                      ? new Date(doc.created_at).toLocaleDateString("fr-FR")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {doc.file_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleShare(doc)}
                          title="Copier le lien de partage"
                        >
                          {copiedId === Number(doc.id) ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Share2 className="h-4 w-4 text-blue-600" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(doc)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(doc)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt,.csv,.zip,.rar"
      />

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogMode !== null}
        onOpenChange={(open) => !open && setDialogMode(null)}
      >
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create"
                ? "Nouveau document"
                : "Modifier le document"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* File upload zone */}
            <div className="space-y-2">
              <Label>Fichier</Label>
              {form.file_url ? (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-dashed">
                  <File className="h-5 w-5 text-blue-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {form.file_name || "Fichier"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {form.file_url}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      Remplacer
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          file_url: "",
                          file_name: "",
                        }))
                      }
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex flex-col items-center gap-2 p-6 border-2 border-dashed rounded-lg hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                      <span className="text-sm text-muted-foreground">
                        Upload en cours…
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Cliquez pour sélectionner un fichier
                      </span>
                      <span className="text-xs text-muted-foreground">
                        PDF, Word, Excel, images… (max 50 Mo)
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="space-y-2">
              <Label>Titre *</Label>
              <Input
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="Titre du document"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type de document</Label>
                <Select
                  value={form.type_document}
                  onValueChange={(v) => updateField("type_document", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select
                  value={form.statut}
                  onValueChange={(v) => updateField("statut", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUT_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Contact</Label>
              <Select
                value={form.contact_id || "none"}
                onValueChange={(v) =>
                  updateField("contact_id", v === "none" ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un contact" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun contact</SelectItem>
                  {(contacts ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {`${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() ||
                        `Contact #${c.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Notes ou commentaires…"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogMode(null)}>
                Annuler
              </Button>
              <Button
                onClick={handleSave}
                disabled={!form.title.trim() || uploading}
              >
                {dialogMode === "create" ? "Créer" : "Enregistrer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
