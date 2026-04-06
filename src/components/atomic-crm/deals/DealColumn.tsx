import { Droppable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";

import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Deal } from "../types";
import { findDealLabel } from "./dealUtils";
import { DealCard } from "./DealCard";

export const DealColumn = ({
  stage,
  deals,
}: {
  stage: string;
  deals: Deal[];
}) => {
  const totalAmount = deals.reduce((sum, deal) => sum + (deal.amount ?? 0), 0);
  const { dealStages, currency } = useConfigurationContext();
  return (
    <div className="flex-1 pb-8 min-w-50 max-w-62.5 shrink-0">
      <div className="flex flex-col items-center rounded-lg bg-muted/40 border border-border/40 py-3 px-2 mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">
            {findDealLabel(dealStages, stage)}
          </h3>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
            {deals.length}
          </Badge>
        </div>
        {totalAmount > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalAmount.toLocaleString("fr-FR", {
              style: "currency",
              currency,
              minimumFractionDigits: 0,
            })}
          </p>
        )}
      </div>
      <Droppable droppableId={stage}>
        {(droppableProvided, snapshot) => (
          <div
            ref={droppableProvided.innerRef}
            {...droppableProvided.droppableProps}
            className={`flex flex-col rounded-xl mt-1 gap-2 min-h-15 p-1 transition-colors ${
              snapshot.isDraggingOver
                ? "bg-primary/5 ring-2 ring-primary/10 ring-inset"
                : ""
            }`}
          >
            {deals.map((deal, index) => (
              <DealCard key={deal.id} deal={deal} index={index} />
            ))}
            {droppableProvided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};
