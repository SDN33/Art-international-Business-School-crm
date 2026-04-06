import { useMutation } from "@tanstack/react-query";
import { isValid } from "date-fns";
import {
  Archive,
  ArchiveRestore,
  Calendar,
  DollarSign,
  FolderKanban,
  Tag,
  Users,
  FileText,
} from "lucide-react";
import {
  ShowBase,
  useDataProvider,
  useNotify,
  useRecordContext,
  useRedirect,
  useRefresh,
  useTranslate,
  useUpdate,
} from "ra-core";
import { DeleteButton } from "@/components/admin/delete-button";
import { EditButton } from "@/components/admin/edit-button";
import { ReferenceArrayField } from "@/components/admin/reference-array-field";
import { ReferenceField } from "@/components/admin/reference-field";
import { ReferenceManyField } from "@/components/admin/reference-many-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

import { CompanyAvatar } from "../companies/CompanyAvatar";
import { NoteCreate } from "../notes/NoteCreate";
import { NotesIterator } from "../notes/NotesIterator";
import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Deal } from "../types";
import { ContactList } from "./ContactList";
import { findDealLabel, formatISODateString } from "./dealUtils";

export const DealShow = ({ open, id }: { open: boolean; id?: string }) => {
  const redirect = useRedirect();
  const handleClose = () => {
    redirect("list", "deals");
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="lg:max-w-4xl p-4 overflow-y-auto max-h-9/10 top-1/20 translate-y-0">
        {id ? (
          <ShowBase id={id}>
            <DealShowContent />
          </ShowBase>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

const DealShowContent = () => {
  const translate = useTranslate();
  const { dealStages, dealCategories, currency } = useConfigurationContext();
  const record = useRecordContext<Deal>();
  if (!record) return null;

  const stageLabel = findDealLabel(dealStages, record.stage);
  const categoryLabel =
    dealCategories.find((c) => c.value === record.category)?.label ??
    record.category;

  return (
    <>
      <div className="space-y-4">
        {record.archived_at ? <ArchivedTitle /> : null}

        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <ReferenceField
              source="company_id"
              reference="companies"
              link="show"
            >
              <CompanyAvatar />
            </ReferenceField>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {record.name}
              </h2>
              {categoryLabel && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {categoryLabel}
                </p>
              )}
            </div>
          </div>
          <div className={`flex gap-2 ${record.archived_at ? "" : "pr-12"}`}>
            {record.archived_at ? (
              <>
                <UnarchiveButton record={record} />
                <DeleteButton />
              </>
            ) : (
              <>
                <ArchiveButton record={record} />
                <EditButton />
              </>
            )}
          </div>
        </div>

        {/* Info cards grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-border/40">
            <CardContent className="p-3 flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                <FolderKanban className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                  Étape
                </p>
                <p className="text-sm font-semibold truncate">{stageLabel}</p>
              </div>
            </CardContent>
          </Card>

          {record.amount != null && (
            <Card className="border-border/40">
              <CardContent className="p-3 flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-md bg-emerald-500/10 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                    Montant
                  </p>
                  <p className="text-sm font-semibold truncate">
                    {record.amount.toLocaleString("fr-FR", {
                      style: "currency",
                      currency,
                      minimumFractionDigits: 0,
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {record.category && (
            <Card className="border-border/40">
              <CardContent className="p-3 flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-md bg-violet-500/10 flex items-center justify-center">
                  <Tag className="h-4 w-4 text-violet-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                    Catégorie
                  </p>
                  <p className="text-sm font-semibold truncate">
                    {categoryLabel}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {record.expected_closing_date && (
            <Card className="border-border/40">
              <CardContent className="p-3 flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-md bg-amber-500/10 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                    Clôture prévue
                  </p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold truncate">
                      {isValid(new Date(record.expected_closing_date))
                        ? formatISODateString(record.expected_closing_date)
                        : translate("resources.deals.invalid_date")}
                    </p>
                    {isValid(new Date(record.expected_closing_date)) &&
                      new Date(record.expected_closing_date) < new Date() && (
                        <Badge
                          variant="destructive"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {translate("crm.common.past")}
                        </Badge>
                      )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Description */}
        {record.description && (
          <div className="rounded-lg border border-border/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Description
              </span>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {record.description}
            </p>
          </div>
        )}

        {/* Contacts – full details */}
        {!!record.contact_ids?.length && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Contacts ({record.contact_ids.length})
              </span>
            </div>
            <ReferenceArrayField
              source="contact_ids"
              reference="contacts_summary"
            >
              <ContactList />
            </ReferenceArrayField>
          </div>
        )}

        {/* Notes */}
        <div>
          <Separator className="mb-4" />
          <ReferenceManyField
            target="deal_id"
            reference="deal_notes"
            sort={{ field: "date", order: "DESC" }}
            empty={<NoteCreate reference={"deals"} />}
          >
            <NotesIterator reference="deals" />
          </ReferenceManyField>
        </div>
      </div>
    </>
  );
};

const ArchivedTitle = () => {
  const translate = useTranslate();
  return (
    <div className="bg-orange-500 px-6 py-4">
      <h3 className="text-lg font-bold text-white">
        {translate("resources.deals.archived.title")}
      </h3>
    </div>
  );
};

const ArchiveButton = ({ record }: { record: Deal }) => {
  const translate = useTranslate();
  const [update] = useUpdate();
  const redirect = useRedirect();
  const notify = useNotify();
  const refresh = useRefresh();
  const handleClick = () => {
    update(
      "deals",
      {
        id: record.id,
        data: { archived_at: new Date().toISOString() },
        previousData: record,
      },
      {
        onSuccess: () => {
          redirect("list", "deals");
          notify("resources.deals.archived.success", {
            type: "info",
            undoable: false,
          });
          refresh();
        },
        onError: () => {
          notify("resources.deals.archived.error", {
            type: "error",
          });
        },
      },
    );
  };

  return (
    <Button
      onClick={handleClick}
      size="sm"
      variant="outline"
      className="flex items-center gap-2 h-9"
    >
      <Archive className="w-4 h-4" />
      {translate("resources.deals.archived.action")}
    </Button>
  );
};

const UnarchiveButton = ({ record }: { record: Deal }) => {
  const translate = useTranslate();
  const dataProvider = useDataProvider();
  const redirect = useRedirect();
  const notify = useNotify();
  const refresh = useRefresh();

  const { mutate } = useMutation({
    mutationFn: () => dataProvider.unarchiveDeal(record),
    onSuccess: () => {
      redirect("list", "deals");
      notify("resources.deals.unarchived.success", {
        type: "info",
        undoable: false,
      });
      refresh();
    },
    onError: () => {
      notify("resources.deals.unarchived.error", {
        type: "error",
      });
    },
  });

  const handleClick = () => {
    mutate();
  };

  return (
    <Button
      onClick={handleClick}
      size="sm"
      variant="outline"
      className="flex items-center gap-2 h-9"
    >
      <ArchiveRestore className="w-4 h-4" />
      {translate("resources.deals.unarchived.action")}
    </Button>
  );
};
