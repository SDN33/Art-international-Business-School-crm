import { useState } from "react";
import {
  useGetList,
  useCreate,
  useUpdate,
  useDelete,
  useNotify,
} from "ra-core";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Trash2,
  Users,
  MoreVertical,
  Pencil,
  Search,
  RefreshCw,
  List,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type ContactList = {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
};

type ListMember = {
  id: number;
  list_id: number;
  contact_id: number;
  added_at: string;
};

type Contact = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email_jsonb: { email: string; type?: string }[];
  phone_jsonb: { number: string; type?: string }[];
};

// ─── Create / Edit Dialog ─────────────────────────────────────────────────────

const ListFormDialog = ({
  open,
  onClose,
  list,
}: {
  open: boolean;
  onClose: () => void;
  list?: ContactList;
}) => {
  const notify = useNotify();
  const [create] = useCreate();
  const [update] = useUpdate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: list?.name ?? "",
    description: list?.description ?? "",
  });

  const isEdit = !!list;

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (isEdit) {
        await update(
          "contact_lists",
          { id: list.id, data: form, previousData: list },
          { returnPromise: true },
        );
        notify("Liste mise à jour", { type: "success" });
      } else {
        await create(
          "contact_lists",
          { data: form },
          { returnPromise: true },
        );
        notify("Liste créée", { type: "success" });
      }
      onClose();
    } catch {
      notify("Erreur lors de l'enregistrement", { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier la liste" : "Nouvelle liste"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Nom de la liste *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex : Inscrits formation automne 2026"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description (optionnel)</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description ou usage de cette liste…"
              rows={3}
              className="resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
          >
            {saving ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Members Sheet ────────────────────────────────────────────────────────────

const MembersSheet = ({
  list,
  open,
  onClose,
}: {
  list: ContactList;
  open: boolean;
  onClose: () => void;
}) => {
  const notify = useNotify();
  const [create] = useCreate();
  const [deleteFn] = useDelete();
  const [contactSearch, setContactSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: members = [], refetch: refetchMembers } =
    useGetList<ListMember>("contact_list_members", {
      filter: { "list_id@eq": list.id },
      pagination: { page: 1, perPage: 2000 },
      sort: { field: "added_at", order: "ASC" },
    });

  const { data: memberDetails = [] } = useGetList<Contact>("contacts", {
    filter: members.length > 0 ? { "id@in": `(${members.map((m) => m.contact_id).join(",")})` } : {},
    pagination: { page: 1, perPage: 2000 },
    sort: { field: "last_name", order: "ASC" },
    enabled: members.length > 0,
  } as Parameters<typeof useGetList>[1]);

  const { data: searchResults = [] } = useGetList<Contact>("contacts", {
    filter: contactSearch
      ? { "last_name@ilike": `%${contactSearch}%` }
      : {},
    pagination: { page: 1, perPage: 50 },
    sort: { field: "last_name", order: "ASC" },
  });

  const existingIds = new Set(members.map((m) => String(m.contact_id)));
  const addable = searchResults.filter(
    (c) => !existingIds.has(String(c.id)) && c.email_jsonb?.length > 0,
  );

  const handleAdd = async () => {
    const toAdd = addable.filter((c) => selected.has(String(c.id)));
    if (!toAdd.length) return;
    try {
      await Promise.all(
        toAdd.map((c) =>
          create(
            "contact_list_members",
            { data: { list_id: list.id, contact_id: Number(c.id) } },
            { returnPromise: true },
          ),
        ),
      );
      notify(`${toAdd.length} contact(s) ajouté(s)`, { type: "success" });
      setSelected(new Set());
      refetchMembers();
    } catch {
      notify("Erreur lors de l'ajout", { type: "error" });
    }
  };

  const handleRemove = async (memberId: number) => {
    try {
      await deleteFn("contact_list_members", { id: memberId }, { returnPromise: true });
      refetchMembers();
    } catch {
      notify("Erreur lors de la suppression", { type: "error" });
    }
  };

  const handleRemoveAll = async () => {
    if (!confirm(`Retirer les ${members.length} membres de la liste ?`)) return;
    try {
      await Promise.all(
        members.map((m) =>
          deleteFn("contact_list_members", { id: m.id }, { returnPromise: true }),
        ),
      );
      refetchMembers();
    } catch {
      notify("Erreur", { type: "error" });
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === addable.length) setSelected(new Set());
    else setSelected(new Set(addable.map((c) => String(c.id))));
  };

  // Map contact details by id
  const detailMap = Object.fromEntries(memberDetails.map((c) => [String(c.id), c]));

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {list.name}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-5 space-y-6">
          {/* Current members */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">
                Membres ({members.length})
              </h3>
              {members.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive text-xs"
                  onClick={handleRemoveAll}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Tout retirer
                </Button>
              )}
            </div>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
                Aucun membre. Ajoutez des contacts ci-dessous.
              </p>
            ) : (
              <div className="space-y-1 max-h-56 overflow-y-auto border rounded-lg p-2">
                {members.map((m) => {
                  const c = detailMap[String(m.contact_id)];
                  const email = c?.email_jsonb?.[0]?.email;
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between text-sm py-1.5 px-1"
                    >
                      <div className="min-w-0">
                        {c ? (
                          <>
                            <span className="font-medium">
                              {c.first_name} {c.last_name}
                            </span>
                            {email && (
                              <span className="text-muted-foreground text-xs ml-2">
                                {email}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            Contact #{m.contact_id}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemove(m.id)}
                        className="text-muted-foreground hover:text-destructive shrink-0 ml-2"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add contacts */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Ajouter des contacts</h3>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom…"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>
            {contactSearch && addable.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-3">
                Aucun contact trouvé avec une adresse email
              </p>
            ) : contactSearch ? (
              <>
                <div className="space-y-1 max-h-52 overflow-y-auto border rounded-lg p-2">
                  <div className="flex items-center gap-2 px-1 py-1 border-b mb-1">
                    <Checkbox
                      id="sel-all-members"
                      checked={selected.size === addable.length && addable.length > 0}
                      onCheckedChange={toggleAll}
                    />
                    <label
                      htmlFor="sel-all-members"
                      className="text-xs text-muted-foreground cursor-pointer"
                    >
                      Tout sélectionner ({addable.length})
                    </label>
                  </div>
                  {addable.map((c) => {
                    const cid = String(c.id);
                    return (
                      <div
                        key={c.id}
                        className="flex items-center gap-2 text-sm py-1.5 px-1 rounded hover:bg-muted/50"
                      >
                        <Checkbox
                          id={`m-${c.id}`}
                          checked={selected.has(cid)}
                          onCheckedChange={() => toggle(cid)}
                        />
                        <label htmlFor={`m-${c.id}`} className="flex-1 min-w-0 cursor-pointer">
                          <span className="font-medium">
                            {c.first_name} {c.last_name}
                          </span>
                          <span className="text-muted-foreground text-xs ml-2">
                            {c.email_jsonb[0]?.email}
                          </span>
                        </label>
                      </div>
                    );
                  })}
                </div>
                <Button
                  className="w-full mt-2"
                  size="sm"
                  disabled={selected.size === 0}
                  onClick={handleAdd}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Ajouter {selected.size > 0 ? `${selected.size} contact(s)` : ""}
                </Button>
              </>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">
                Saisissez un nom pour rechercher
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const ContactListsPage = () => {
  const notify = useNotify();
  const [deleteFn] = useDelete();

  const [createOpen, setCreateOpen] = useState(false);
  const [editList, setEditList] = useState<ContactList | null>(null);
  const [membersSheet, setMembersSheet] = useState<ContactList | null>(null);
  const [search, setSearch] = useState("");

  const { data: lists = [], isLoading, refetch } = useGetList<ContactList>(
    "contact_lists",
    {
      pagination: { page: 1, perPage: 200 },
      sort: { field: "created_at", order: "DESC" },
    },
  );

  // Count members per list
  const { data: allMembers = [] } = useGetList<ListMember>(
    "contact_list_members",
    {
      pagination: { page: 1, perPage: 10000 },
      sort: { field: "id", order: "ASC" },
    },
  );
  const memberCounts: Record<number, number> = {};
  for (const m of allMembers) {
    memberCounts[m.list_id] = (memberCounts[m.list_id] ?? 0) + 1;
  }

  const filtered = lists.filter(
    (l) => !search || l.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleDelete = async (list: ContactList) => {
    if (!confirm(`Supprimer la liste "${list.name}" et tous ses membres ?`)) return;
    try {
      await deleteFn("contact_lists", { id: list.id }, { returnPromise: true });
      notify("Liste supprimée", { type: "success" });
      refetch();
    } catch {
      notify("Erreur lors de la suppression", { type: "error" });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 border-b bg-background px-4 md:px-6 pt-4 pb-4">
        <div className="flex items-center gap-2">
          <List className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Listes de contacts</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Créez des groupes de contacts pour vos campagnes emailing
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une liste…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => refetch()} title="Actualiser">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle liste
            </Button>
          </div>
        </div>

        {/* Stats */}
        {lists.length > 0 && (
          <div className="flex gap-4 text-sm text-muted-foreground mb-4">
            <span>{lists.length} liste(s)</span>
            <span>·</span>
            <span>{allMembers.length} membre(s) au total</span>
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <List className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>{search ? "Aucune liste trouvée" : "Aucune liste de contacts"}</p>
            {!search && (
              <p className="text-xs mt-1">
                Créez votre première liste pour segmenter vos contacts
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((list) => {
              const count = memberCounts[list.id] ?? 0;
              return (
                <div
                  key={list.id}
                  className="border rounded-lg p-4 hover:bg-muted/30 transition-colors flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-medium text-sm truncate">{list.name}</h3>
                      {list.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {list.description}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="shrink-0 h-7 w-7 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditList(list)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(list)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-1">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs",
                        count > 0 ? "bg-primary/10 text-primary" : "",
                      )}
                    >
                      <Users className="h-3 w-3 mr-1" />
                      {count} contact{count !== 1 ? "s" : ""}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setMembersSheet(list)}
                    >
                      <UserPlus className="h-3 w-3 mr-1" />
                      Gérer
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ListFormDialog
        open={createOpen}
        onClose={() => { setCreateOpen(false); refetch(); }}
      />
      {editList && (
        <ListFormDialog
          open={!!editList}
          onClose={() => { setEditList(null); refetch(); }}
          list={editList}
        />
      )}
      {membersSheet && (
        <MembersSheet
          list={membersSheet}
          open={!!membersSheet}
          onClose={() => setMembersSheet(null)}
        />
      )}
    </div>
  );
};
