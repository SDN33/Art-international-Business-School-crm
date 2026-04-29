import type { ReactNode } from "react";
import type { InputProps } from "ra-core";
import { useGetIdentity, useListContext, useListController, useTranslate } from "ra-core";
import { matchPath, useLocation } from "react-router";
import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import { CreateButton } from "@/components/admin/create-button";
import { ExportButton } from "@/components/admin/export-button";
import { List } from "@/components/admin/list";
import { ReferenceInput } from "@/components/admin/reference-input";
import { FilterButton } from "@/components/admin/filter-form";
import { SearchInput } from "@/components/admin/search-input";
import { SelectInput } from "@/components/admin/select-input";
import { DateInput } from "@/components/admin/date-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useConfigurationContext } from "../root/ConfigurationContext";
import { TopToolbar } from "../layout/TopToolbar";
import { DealArchivedList } from "./DealArchivedList";
import { DealCreate } from "./DealCreate";
import { DealEdit } from "./DealEdit";
import { DealEmpty } from "./DealEmpty";
import { DealListContent } from "./DealListContent";
import { DealShow } from "./DealShow";
import { OnlyMineInput } from "./OnlyMineInput";
import { ManageColumnsDialog } from "./ManageColumnsDialog";

const DealList = () => {
  const { identity } = useGetIdentity();
  const { dealCategories } = useConfigurationContext();
  const translate = useTranslate();

  if (!identity) return null;

  const dealFilters = [
    <SearchInput source="q" alwaysOn />,
    <ReferenceInput source="company_id" reference="companies">
      <AutocompleteInput
        label={false}
        placeholder={translate("resources.deals.fields.company_id")}
      />
    </ReferenceInput>,
    <WrapperField source="category" label="resources.deals.fields.category">
      <SelectInput
        source="category"
        label={false}
        emptyText="resources.deals.fields.category"
        choices={dealCategories}
        optionText="label"
        optionValue="value"
      />
    </WrapperField>,
    <OnlyMineInput source="sales_id" alwaysOn />,
    <DateInput source="created_at@gte" label="Créé depuis" />,
    <DateInput source="created_at@lte" label="Créé jusqu'au" />,
  ];

  return (
    <List
      perPage={1000}
      filter={{ "archived_at@is": null }}
      title={false}
      sort={{ field: "created_at", order: "DESC" }}
      filters={dealFilters}
      actions={<DealActions />}
      pagination={null}
      disableSyncWithLocation
    >
      <DealLayout />
    </List>
  );
};

const DealLayout = () => {
  const location = useLocation();
  const matchCreate = matchPath("/deals/create", location.pathname);
  const matchShow = matchPath("/deals/:id/show", location.pathname);
  const matchEdit = matchPath("/deals/:id", location.pathname);

  const { data, isPending, filterValues } = useListContext();
  const hasFilters = filterValues && Object.keys(filterValues).length > 0;

  if (isPending) return null;
  if (!data?.length && !hasFilters)
    return (
      <>
        <DealEmpty>
          <DealShow open={!!matchShow} id={matchShow?.params.id} />
          <DealArchivedList />
        </DealEmpty>
      </>
    );

  return (
    <div className="w-full">
      <DealListContent />
      <DealArchivedList />
      <DealCreate open={!!matchCreate} />
      <DealEdit open={!!matchEdit && !matchCreate} id={matchEdit?.params.id} />
      <DealShow open={!!matchShow} id={matchShow?.params.id} />
    </div>
  );
};

const SORT_OPTIONS = [
  { value: "created_at", order: "DESC", label: "Ajout récent → ancien" },
  { value: "created_at", order: "ASC", label: "Ajout ancien → récent" },
  { value: "updated_at", order: "DESC", label: "Modifié récemment" },
  { value: "amount", order: "DESC", label: "Montant ↓" },
  { value: "expected_closing_date", order: "ASC", label: "Clôture prévue ↑" },
  { value: "index", order: "DESC", label: "Position Kanban" },
];

const DealSortSelect = () => {
  const { sort, setSort } = useListController();
  const currentKey = `${sort.field}:${sort.order}`;
  return (
    <Select
      value={currentKey}
      onValueChange={(val) => {
        const [field, order] = val.split(":");
        setSort({ field, order: order as "ASC" | "DESC" });
      }}
    >
      <SelectTrigger className="h-8 text-xs w-44">
        <SelectValue placeholder="Trier par…" />
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((opt) => (
          <SelectItem key={`${opt.value}:${opt.order}`} value={`${opt.value}:${opt.order}`} className="text-xs">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const DealActions = () => (
  <TopToolbar>
    <DealSortSelect />
    <FilterButton />
    <ExportButton />
    <ManageColumnsDialog />
    <CreateButton label="resources.deals.action.new" />
  </TopToolbar>
);

/**
 *
 * Used so that label of filters can be inferred for the select display,
 * but not be displayed when showing the input.
 */
const WrapperField = ({ children }: InputProps & { children: ReactNode }) =>
  children;

export default DealList;
