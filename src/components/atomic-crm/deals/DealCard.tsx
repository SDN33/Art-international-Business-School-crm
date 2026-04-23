import { Draggable } from "@hello-pangea/dnd";
import { useRedirect, RecordContextProvider, useGetOne } from "ra-core";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Calendar, Euro, GraduationCap, Bot } from "lucide-react";

import type { Contact, Deal } from "../types";
import { LeadTemperatureBadge } from "../contacts/LeadTemperatureBadge";

const FORMATION_COLORS: Record<string, string> = {
  "Acteur Leader": "bg-blue-50 text-blue-700 ring-1 ring-blue-700/10",
  "Court-Metrage": "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-700/10",
  "Court-métrage": "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-700/10",
  "Doublage & Voix-Off":
    "bg-violet-50 text-violet-700 ring-1 ring-violet-700/10",
  "Doublage": "bg-violet-50 text-violet-700 ring-1 ring-violet-700/10",
  "Pro Tools": "bg-amber-50 text-amber-700 ring-1 ring-amber-700/10",
  "Cannes": "bg-pink-50 text-pink-700 ring-1 ring-pink-700/10",
  "Résidence": "bg-orange-50 text-orange-700 ring-1 ring-orange-700/10",
  "Journées Casting":
    "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-700/10",
};

const getFormationColor = (formation?: string) => {
  if (!formation) return "bg-gray-50 text-gray-600 ring-1 ring-gray-500/10";
  for (const [key, color] of Object.entries(FORMATION_COLORS)) {
    if (formation.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return "bg-gray-50 text-gray-600 ring-1 ring-gray-500/10";
};

/** Parse deal name "Formation – Contact Name" into parts */
const parseDealName = (name: string) => {
  const sep = name.indexOf(" – ");
  if (sep === -1) return { formation: null, contact: name };
  return {
    formation: name.slice(0, sep).trim(),
    contact: name.slice(sep + 3).trim(),
  };
};

export const DealCard = ({ deal, index }: { deal: Deal; index: number }) => {
  if (!deal) return null;

  return (
    <Draggable draggableId={String(deal.id)} index={index}>
      {(provided, snapshot) => (
        <DealCardContent provided={provided} snapshot={snapshot} deal={deal} />
      )}
    </Draggable>
  );
};

export const DealCardContent = ({
  provided,
  snapshot,
  deal,
}: {
  provided?: any;
  snapshot?: any;
  deal: Deal;
}) => {
  const redirect = useRedirect();
  const handleClick = () => {
    redirect(`/deals/${deal.id}/show`, undefined, undefined, undefined, {
      _scrollToTop: false,
    });
  };

  const { formation, contact } = parseDealName(deal.name);
  const formationLabel = deal.formation_souhaitee ?? formation;
  const contactCount = deal.contact_ids?.length ?? 0;
  const primaryContactId = deal.contact_ids?.[0];

  // Charge le contact principal pour afficher la pastille chaud/tiède + icône bot.
  // React Query déduplique automatiquement entre cards qui partagent le même contact.
  const { data: primaryContact } = useGetOne<Contact>(
    "contacts",
    { id: primaryContactId! },
    { enabled: !!primaryContactId },
  );

  return (
    <div
      className="cursor-pointer"
      {...provided?.draggableProps}
      {...provided?.dragHandleProps}
      ref={provided?.innerRef}
      onClick={handleClick}
    >
      <RecordContextProvider value={deal}>
        <Card
          className={`group transition-all duration-200 border-border/50 ${
            snapshot?.isDragging
              ? "opacity-90 rotate-1 shadow-lg ring-2 ring-primary/20"
              : "shadow-sm hover:shadow-md hover:border-primary/30"
          }`}
        >
          <CardContent className="p-3 space-y-2">
            {/* Formation badge + pastille température + bot */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {formationLabel && (
                <>
                  <GraduationCap className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                  <span
                    className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${getFormationColor(formationLabel)}`}
                  >
                    {formationLabel}
                  </span>
                </>
              )}
              {primaryContact && (
                <LeadTemperatureBadge
                  contact={primaryContact}
                  showLabel={false}
                  size="xs"
                />
              )}
              {primaryContact?.qualification_bot && (
                <span
                  className="inline-flex items-center justify-center rounded-full bg-indigo-100 text-indigo-700 border border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900 h-4 w-4"
                  title="Traité par le bot openclaw"
                >
                  <Bot className="h-2.5 w-2.5" />
                </span>
              )}
            </div>

            {/* Contact name */}
            <p className="text-sm font-semibold leading-tight">
              {contact}
            </p>

            {/* Info row: date + amount + contacts */}
            <div className="flex items-center gap-3 pt-1 border-t border-border/40">
              {deal.created_at && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {new Date(deal.created_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              )}
              {deal.amount != null && deal.amount > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                  <Euro className="h-3 w-3" />
                  {deal.amount.toLocaleString("fr-FR")}
                </span>
              )}
              {contactCount > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
                  <Users className="h-3 w-3" />
                  {contactCount}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </RecordContextProvider>
    </div>
  );
};
