import { Flame, Snowflake, Thermometer } from "lucide-react";
import { cn } from "@/lib/utils";

export type LeadTemperature = "hot" | "warm" | "cold" | "neutral";

/**
 * Compute lead temperature from CRM signals.
 * - hot 🔥 : RDV calendly réservé, inscrit, converti, ou qualifié AFDAS
 * - warm 🌡️ : qualifié, contacté WA, à rappeler, ou qualification bot remplie
 * - cold ❄️ : perdu, no-show élevé
 * - neutral : pas assez de signal
 */
export function computeLeadTemperature(contact: {
  pipeline_status?: string | null;
  calendly_reserved?: boolean | null;
  qualification_bot?: string | null;
  indice_no_show?: number | null;
  reponse_relance_wa?: string | null;
  status?: string | null;
}): LeadTemperature {
  const status = contact.pipeline_status ?? "";

  if (
    contact.calendly_reserved ||
    ["Inscrit", "Converti", "Qualifié AFDAS"].includes(status)
  ) {
    return "hot";
  }

  if (
    ["Qualifié", "Contacté WA", "À rappeler"].includes(status) ||
    (contact.qualification_bot && contact.qualification_bot.length > 0) ||
    (contact.reponse_relance_wa && contact.reponse_relance_wa.length > 0)
  ) {
    return "warm";
  }

  if (
    status === "Perdu" ||
    contact.status === "cold" ||
    (contact.indice_no_show ?? 0) >= 2
  ) {
    return "cold";
  }

  return "neutral";
}

const TEMPERATURE_CONFIG: Record<
  LeadTemperature,
  { label: string; icon: typeof Flame; className: string }
> = {
  hot: {
    label: "Chaud",
    icon: Flame,
    className:
      "bg-red-100 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
  },
  warm: {
    label: "Tiède",
    icon: Thermometer,
    className:
      "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  },
  cold: {
    label: "Froid",
    icon: Snowflake,
    className:
      "bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900",
  },
  neutral: {
    label: "—",
    icon: Thermometer,
    className: "bg-muted text-muted-foreground border-border",
  },
};

/**
 * Pastille température lead, à afficher sur les fiches contacts qualifiées par le bot.
 */
export const LeadTemperatureBadge = ({
  contact,
  showLabel = true,
  size = "sm",
}: {
  contact: Parameters<typeof computeLeadTemperature>[0];
  showLabel?: boolean;
  size?: "xs" | "sm";
}) => {
  const temp = computeLeadTemperature(contact);
  if (temp === "neutral" && !showLabel) return null;

  const cfg = TEMPERATURE_CONFIG[temp];
  const Icon = cfg.icon;
  const sizeCls =
    size === "xs"
      ? "text-[10px] px-1.5 py-0 gap-1"
      : "text-[11px] px-2 py-0.5 gap-1.5";
  const iconCls = size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        sizeCls,
        cfg.className,
      )}
      title={`Lead ${cfg.label.toLowerCase()}`}
    >
      <Icon className={iconCls} />
      {showLabel && <span>{cfg.label}</span>}
    </span>
  );
};
