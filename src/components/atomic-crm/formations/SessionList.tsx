import { useListContext, useGetList } from "ra-core";
import { List } from "@/components/admin/list";
import { SearchInput } from "@/components/admin/search-input";
import { SelectInput } from "@/components/admin/select-input";
import { FilterButton } from "@/components/admin/filter-form";
import { ReferenceInput } from "@/components/admin/reference-input";
import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Calendar, MapPin, Users } from "lucide-react";
import { TopToolbar } from "../layout/TopToolbar";
import { statusChoices, statusColors, type Session } from "./constants";
import { useSessionDialog, SessionDialog } from "./SessionDialog";

const sessionFilters = [
  <SearchInput source="session_name@ilike" alwaysOn />,
  <ReferenceInput source="formation_id" reference="formations">
    <AutocompleteInput label="Formation" optionText="nom" />
  </ReferenceInput>,
  <SelectInput source="status" choices={statusChoices} label="Statut" />,
];

const SessionList = () => (
  <List
    title="Sessions calendrier"
    perPage={50}
    sort={{ field: "start_date", order: "ASC" }}
    filters={sessionFilters}
    actions={
      <TopToolbar>
        <FilterButton />
      </TopToolbar>
    }
  >
    <SessionTable />
  </List>
);

const SessionTable = () => {
  const { data, isPending } = useListContext();
  const { data: formations } = useGetList("formations", {
    pagination: { page: 1, perPage: 200 },
    sort: { field: "nom", order: "ASC" },
  });

  const {
    dialogMode,
    setDialogMode,
    form,
    openCreate,
    openEdit,
    handleSave,
    handleDelete,
    updateField,
  } = useSessionDialog();

  if (isPending)
    return (
      <div className="p-12 text-center text-muted-foreground">
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
          <Plus className="h-4 w-4" /> Nouvelle session
        </Button>
      </div>

      {!data?.length ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">Aucune session</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Créez une première session pour commencer
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-muted-foreground text-xs uppercase tracking-wide">
                <th className="px-4 py-2.5 font-medium">Statut</th>
                <th className="px-4 py-2.5 font-medium">Session</th>
                <th className="px-4 py-2.5 font-medium">Formation</th>
                <th className="px-4 py-2.5 font-medium">Dates</th>
                <th className="px-4 py-2.5 font-medium">Lieu</th>
                <th className="px-4 py-2.5 font-medium">Capacité</th>
                <th className="px-4 py-2.5 font-medium w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((session: Session) => (
                <tr
                  key={session.id}
                  className="group border-b border-border/50 hover:bg-muted/40 transition-colors cursor-pointer"
                  onClick={() => openEdit(session)}
                >
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${statusColors[session.status ?? ""] || "bg-gray-50 text-gray-600 ring-1 ring-gray-500/20"}`}
                    >
                      {session.status || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {session.session_name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {session.formation_id && formations
                      ? (formations.find(
                          (f: any) => f.id === session.formation_id,
                        )?.nom ?? "—")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground/60" />
                      <span>
                        {session.start_date
                          ? new Date(session.start_date).toLocaleDateString(
                              "fr-FR",
                              { day: "numeric", month: "short" },
                            )
                          : "—"}
                        {session.end_date &&
                          ` → ${new Date(session.end_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {session.location ? (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground/60" />
                        {session.location}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {session.capacity ? (
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-muted-foreground/60" />
                        {session.capacity}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div
                      className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(session)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(session)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SessionDialog
        dialogMode={dialogMode}
        form={form}
        updateField={updateField}
        handleSave={handleSave}
        onClose={() => setDialogMode(null)}
      />
    </>
  );
};

export default SessionList;
