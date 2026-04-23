import { useGetList, useListContext, useTranslate } from "ra-core";
import { Link as RouterLink } from "react-router";
import {
  Mail,
  Phone,
  GraduationCap,
  ExternalLink,
  MessageCircle,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Avatar } from "../contacts/Avatar";
import { LeadTemperatureBadge } from "../contacts/LeadTemperatureBadge";
import { parseBotNote } from "../notes/BotNoteDisplay";
import type { ContactNote } from "../types";

const PIPELINE_STATUS_COLORS: Record<string, string> = {
  "Nouveau lead": "bg-purple-100 text-purple-700",
  "Contacté WA": "bg-teal-100 text-teal-700",
  "À rappeler": "bg-amber-100 text-amber-700",
  Qualifié: "bg-indigo-100 text-indigo-700",
  "Qualifié AFDAS": "bg-emerald-100 text-emerald-700",
  Inscrit: "bg-green-100 text-green-700",
  Converti: "bg-green-200 text-green-800",
  Perdu: "bg-red-100 text-red-700",
};

/** Compact version – just avatar + name (used in DealCard) */
export const ContactListCompact = () => {
  const { data, error, isPending } = useListContext();
  const translate = useTranslate();
  if (isPending || error) return <div className="h-8" />;
  return (
    <div className="flex flex-row flex-wrap gap-4 mt-4">
      {data.map((contact) => (
        <div className="flex flex-row gap-4 items-center" key={contact.id}>
          <Avatar record={contact} />
          <div className="flex flex-col">
            <RouterLink
              to={`/contacts/${contact.id}/show`}
              className="text-sm hover:underline"
            >
              {contact.first_name} {contact.last_name}
            </RouterLink>
            <span className="text-xs text-muted-foreground">
              {contact.title && contact.company_name
                ? translate("resources.contacts.position_at_company", {
                    title: contact.title,
                    company: contact.company_name,
                  })
                : contact.title || contact.company_name}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

/** Full version – shows email, phone, formation, pipeline status (used in DealShow) */
export const ContactList = () => {
  const { data, error, isPending } = useListContext();
  if (isPending || error) return <div className="h-8" />;
  return (
    <div className="flex flex-col gap-3 mt-2">
      {data.map((contact) => {
        const email = getFirstEmail(contact);
        const phone = getFirstPhone(contact);
        return (
          <Card key={contact.id} className="border border-border/60 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Avatar record={contact} width={40} height={40} />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <RouterLink
                      to={`/contacts/${contact.id}/show`}
                      className="text-sm font-semibold hover:underline text-foreground"
                    >
                      {contact.first_name} {contact.last_name}
                    </RouterLink>
                    <div className="flex items-center gap-2 shrink-0">
                      <LeadTemperatureBadge contact={contact} />
                      {contact.pipeline_status && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${PIPELINE_STATUS_COLORS[contact.pipeline_status] ?? "bg-gray-100 text-gray-700"}`}
                        >
                          {contact.pipeline_status}
                        </span>
                      )}
                    </div>
                  </div>

                  {(contact.title || contact.company_name) && (
                    <p className="text-xs text-muted-foreground">
                      {contact.title}
                      {contact.title && contact.company_name ? " · " : ""}
                      {contact.company_name}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                    {email && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <a
                          href={`mailto:${email}`}
                          className="hover:underline hover:text-foreground"
                        >
                          {email}
                        </a>
                      </span>
                    )}
                    {phone && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <a
                          href={`tel:${phone}`}
                          className="hover:underline hover:text-foreground"
                        >
                          {phone}
                        </a>
                      </span>
                    )}
                    {contact.formation_souhaitee && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <GraduationCap className="h-3 w-3" />
                        {contact.formation_souhaitee}
                      </span>
                    )}
                  </div>

                  <ContactBotSummary contactId={contact.id} />
                </div>
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                >
                  <RouterLink to={`/contacts/${contact.id}/show`}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </RouterLink>
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

function getFirstEmail(contact: any): string | null {
  if (!contact.email_jsonb || !Array.isArray(contact.email_jsonb))
    return null;
  const entry = contact.email_jsonb[0];
  return entry?.email ?? null;
}

function getFirstPhone(contact: any): string | null {
  if (!contact.phone_jsonb || !Array.isArray(contact.phone_jsonb))
    return null;
  const entry = contact.phone_jsonb[0];
  return entry?.number ?? entry?.phone ?? entry?.value ?? null;
}

/**
 * Affiche un résumé court (3 dernières notes bot) sous chaque fiche contact
 * pour qu'un sales puisse comprendre l'historique sans ouvrir la fiche.
 */
const ContactBotSummary = ({ contactId }: { contactId: string | number }) => {
  const { data, isPending } = useGetList<ContactNote>(
    "contact_notes",
    {
      filter: { contact_id: contactId },
      sort: { field: "date", order: "DESC" },
      pagination: { page: 1, perPage: 5 },
    },
    { enabled: contactId != null },
  );

  if (isPending || !data?.length) return null;

  const botNotes = data
    .map((n) => ({ note: n, parsed: parseBotNote(n.text) }))
    .filter((x) => x.parsed)
    .slice(0, 3);

  if (!botNotes.length) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border/40 space-y-1.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        <MessageCircle className="h-3 w-3" />
        Résumé des échanges ({botNotes.length})
      </div>
      <ul className="space-y-1.5">
        {botNotes.map(({ note, parsed }) => {
          const date = note.date ? new Date(note.date) : null;
          return (
            <li
              key={note.id}
              className="text-xs flex items-start gap-2 leading-snug"
            >
              {date && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0 mt-0.5">
                  <CalendarIcon className="h-2.5 w-2.5" />
                  {date.toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </span>
              )}
              <div className="flex-1 min-w-0">
                {parsed?.issue && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 mr-1.5 font-normal"
                  >
                    {parsed.issue}
                  </Badge>
                )}
                {parsed?.details && (
                  <span className="text-foreground/80">{parsed.details}</span>
                )}
                {!parsed?.details && parsed?.raw && (
                  <span className="text-foreground/80">{parsed.raw}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
