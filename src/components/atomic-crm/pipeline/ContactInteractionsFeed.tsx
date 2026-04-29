import { useGetList } from "ra-core";
import { Bot, Phone, Mail, MessageSquare, Video, Users, StickyNote, ArrowDownLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  "Appel téléphonique": <Phone className="h-3.5 w-3.5" />,
  Email: <Mail className="h-3.5 w-3.5" />,
  "Message WhatsApp": <MessageSquare className="h-3.5 w-3.5" />,
  "Contact sortant Bot": <Bot className="h-3.5 w-3.5" />,
  "Message entrant": <ArrowDownLeft className="h-3.5 w-3.5" />,
  "Réunion en ligne": <Video className="h-3.5 w-3.5" />,
  "Réunion présentiel": <Users className="h-3.5 w-3.5" />,
  "Note de suivi": <StickyNote className="h-3.5 w-3.5" />,
};

const TYPE_COLORS: Record<string, string> = {
  "Appel téléphonique": "bg-blue-100 text-blue-700 border-blue-200",
  Email: "bg-purple-100 text-purple-700 border-purple-200",
  "Message WhatsApp": "bg-green-100 text-green-700 border-green-200",
  "Contact sortant Bot": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Message entrant": "bg-teal-100 text-teal-700 border-teal-200",
  "Réunion en ligne": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Réunion présentiel": "bg-orange-100 text-orange-700 border-orange-200",
  "Note de suivi": "bg-gray-100 text-gray-600 border-gray-200",
};

const STATUT_COLORS: Record<string, string> = {
  Envoyé: "bg-green-50 text-green-600",
  Fait: "bg-green-50 text-green-600",
  "En attente": "bg-yellow-50 text-yellow-600",
  "À faire": "bg-gray-50 text-gray-500",
};

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Affiche le fil des interactions (contacts sortants/entrants, appels, etc.)
 * pour un contact donné. S'intègre dans le panneau notes/activité.
 */
export const ContactInteractionsFeed = ({
  contactId,
}: {
  contactId: number;
}) => {
  const { data: interactions = [], isPending } = useGetList("interactions", {
    pagination: { page: 1, perPage: 50 },
    sort: { field: "date_heure", order: "DESC" },
    filter: { "contact_id@eq": contactId },
  });

  if (isPending) return null;
  if (!interactions.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Aucun échange enregistré
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {interactions.map((interaction) => {
        const colorClass =
          TYPE_COLORS[interaction.type_interaction ?? ""] ??
          "bg-gray-100 text-gray-600 border-gray-200";
        const icon = TYPE_ICONS[interaction.type_interaction ?? ""] ?? (
          <MessageSquare className="h-3.5 w-3.5" />
        );
        return (
          <div
            key={interaction.id}
            className="rounded-lg border bg-card px-3 py-2 text-sm"
          >
            <div className="flex items-start gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${colorClass}`}
              >
                {icon}
                {interaction.type_interaction ?? "Interaction"}
              </span>
              {interaction.statut_suivi && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUT_COLORS[interaction.statut_suivi] ?? ""}`}
                >
                  {interaction.statut_suivi}
                </span>
              )}
              <span className="ml-auto text-xs text-muted-foreground">
                {formatDate(interaction.date_heure ?? interaction.created_at)}
              </span>
            </div>
            {interaction.titre && (
              <p className="mt-1 font-medium text-foreground text-xs">
                {interaction.titre}
              </p>
            )}
            {interaction.message && (
              <p className="mt-0.5 text-muted-foreground text-xs line-clamp-3 whitespace-pre-wrap">
                {interaction.message}
              </p>
            )}
            {interaction.responsable && (
              <p className="mt-1 text-[11px] text-muted-foreground/60">
                — {interaction.responsable}
                {interaction.canal ? ` · ${interaction.canal}` : ""}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
