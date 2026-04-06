import { useRecordContext } from "ra-core";
import {
  GraduationCap,
  Globe,
  Calendar,
  Target,
  TrendingUp,
  MessageCircle,
  Mail,
  AlertTriangle,
  Link as LinkIcon,
  Euro,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Contact } from "../types";

const PIPELINE_STATUS_COLORS: Record<string, string> = {
  "Nouveau lead": "bg-purple-100 text-purple-700",
  "Contacté WA": "bg-teal-100 text-teal-700",
  "À rappeler": "bg-amber-100 text-amber-700",
  "Qualifié": "bg-indigo-100 text-indigo-700",
  "Qualifié AFDAS": "bg-emerald-100 text-emerald-700",
  "Inscrit": "bg-green-100 text-green-700",
  "Converti": "bg-green-200 text-green-800",
  "Perdu": "bg-red-100 text-red-700",
};

export const ContactLeadInfo = () => {
  const record = useRecordContext<Contact>();
  if (!record) return null;

  const hasLeadInfo =
    record.pipeline_status ||
    record.formation_souhaitee ||
    record.origine_lead ||
    record.valeur_estimee ||
    record.calendly_reserved ||
    record.qualification_bot ||
    record.reponse_relance_email ||
    record.reponse_relance_wa ||
    record.indice_no_show ||
    record.lien_calendly ||
    record.converted_at ||
    record.utm_source;

  if (!hasLeadInfo) return null;

  return (
    <div className="space-y-2">
      {record.pipeline_status && (
        <InfoRow
          icon={<Target className="w-4 h-4 text-muted-foreground" />}
          label="Pipeline"
          value={
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${PIPELINE_STATUS_COLORS[record.pipeline_status] ?? "bg-gray-100 text-gray-700"}`}
            >
              {record.pipeline_status}
            </span>
          }
        />
      )}

      {record.formation_souhaitee && (
        <InfoRow
          icon={<GraduationCap className="w-4 h-4 text-muted-foreground" />}
          label="Formation"
          value={
            <Badge variant="secondary" className="text-xs">
              {record.formation_souhaitee}
            </Badge>
          }
        />
      )}

      {record.origine_lead && (
        <InfoRow
          icon={<Globe className="w-4 h-4 text-muted-foreground" />}
          label="Origine"
          value={
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-700">
              {record.origine_lead}
            </span>
          }
        />
      )}

      {record.valeur_estimee != null && record.valeur_estimee > 0 && (
        <InfoRow
          icon={<Euro className="w-4 h-4 text-muted-foreground" />}
          label="Valeur estimée"
          value={
            <span className="text-sm font-medium text-green-700">
              {new Intl.NumberFormat("fr-FR", {
                style: "currency",
                currency: "EUR",
              }).format(record.valeur_estimee)}
            </span>
          }
        />
      )}

      {record.lien_calendly && (
        <InfoRow
          icon={<Calendar className="w-4 h-4 text-muted-foreground" />}
          label="Calendly"
          value={
            <a
              href={record.lien_calendly}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <LinkIcon className="w-3 h-3" />
              Lien RDV
            </a>
          }
        />
      )}

      {(record.calendly_reserved ||
        record.qualification_bot ||
        record.reponse_relance_email ||
        record.reponse_relance_wa) && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {record.calendly_reserved && (
            <Badge
              variant="outline"
              className="text-[10px] gap-1 border-green-300 text-green-700"
            >
              <CheckCircle2 className="w-3 h-3" />
              Calendly réservé
            </Badge>
          )}
          {record.qualification_bot && (
            <Badge
              variant="outline"
              className="text-[10px] gap-1 border-blue-300 text-blue-700"
            >
              <TrendingUp className="w-3 h-3" />
              Qualifié bot
            </Badge>
          )}
          {record.reponse_relance_email && (
            <Badge
              variant="outline"
              className="text-[10px] gap-1 border-orange-300 text-orange-700"
            >
              <Mail className="w-3 h-3" />
              Réponse email
            </Badge>
          )}
          {record.reponse_relance_wa && (
            <Badge
              variant="outline"
              className="text-[10px] gap-1 border-teal-300 text-teal-700"
            >
              <MessageCircle className="w-3 h-3" />
              Réponse WA
            </Badge>
          )}
        </div>
      )}

      {record.indice_no_show != null && record.indice_no_show > 0 && (
        <InfoRow
          icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
          label="No-show"
          value={
            <span className="text-sm font-medium text-amber-600">
              {record.indice_no_show}×
            </span>
          }
        />
      )}

      {record.converted_at && (
        <InfoRow
          icon={<CheckCircle2 className="w-4 h-4 text-green-500" />}
          label="Converti le"
          value={
            <span className="text-sm text-muted-foreground">
              {new Date(record.converted_at).toLocaleDateString("fr-FR")}
            </span>
          }
        />
      )}

      {(record.utm_source || record.utm_medium || record.utm_campaign) && (
        <div className="pt-1 border-t border-border/50 mt-2">
          <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
            Tracking UTM
          </div>
          <div className="flex flex-wrap gap-1">
            {record.utm_source && (
              <Badge variant="outline" className="text-[10px]">
                source: {record.utm_source}
              </Badge>
            )}
            {record.utm_medium && (
              <Badge variant="outline" className="text-[10px]">
                medium: {record.utm_medium}
              </Badge>
            )}
            {record.utm_campaign && (
              <Badge variant="outline" className="text-[10px]">
                campaign: {record.utm_campaign}
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const InfoRow = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex items-center gap-2 min-h-6">
    {icon}
    <span className="text-xs text-muted-foreground w-20 shrink-0">
      {label}
    </span>
    <div className="flex-1">{value}</div>
  </div>
);
