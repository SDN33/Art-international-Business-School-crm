import { useGetList } from "ra-core";
import { useMemo } from "react";
import {
  Users,
  UserPlus,
  TrendingUp,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Contact } from "../types";

const CONVERTED_STATUSES = [
  "converti",
  "Converti",
  "inscrit",
  "Inscrit",
];

const QUALIFIED_STATUSES = [
  "qualifie",
  "Qualifié",
  "qualifie-afdas",
  "Qualifié AFDAS",
  "envoyer-dossier-afdas",
  "Envoyer le dossier AFDAS",
  "afdas-court-metrage",
  "AFDAS Court Métrage",
  "en-negociation",
  "En négociation",
  "devis-envoye",
  "Devis envoyé",
];

export const KpiCards = () => {
  const { data: contacts, isPending } = useGetList<Contact>("contacts", {
    pagination: { page: 1, perPage: 5000 },
    sort: { field: "first_seen", order: "DESC" },
  });

  const stats = useMemo(() => {
    if (!contacts) return null;

    const total = contacts.length;

    // Leads this week
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const thisWeek = contacts.filter(
      (c) => new Date(c.first_seen) >= weekAgo,
    ).length;
    const lastWeek = contacts.filter(
      (c) =>
        new Date(c.first_seen) >= twoWeeksAgo &&
        new Date(c.first_seen) < weekAgo,
    ).length;
    const weekTrend =
      lastWeek > 0
        ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
        : thisWeek > 0
          ? 100
          : 0;

    // Converted (inscrit / converti)
    const converted = contacts.filter((c) =>
      CONVERTED_STATUSES.includes(c.pipeline_status ?? ""),
    ).length;
    const conversionRate =
      total > 0 ? ((converted / total) * 100).toFixed(1) : "0";

    // Qualified (in qualified stages)
    const qualified = contacts.filter((c) =>
      QUALIFIED_STATUSES.includes(c.pipeline_status ?? ""),
    ).length;

    // Leads this month vs last month
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const thisMonth = contacts.filter(
      (c) => new Date(c.first_seen) >= monthAgo,
    ).length;
    const lastMonth = contacts.filter(
      (c) =>
        new Date(c.first_seen) >= twoMonthsAgo &&
        new Date(c.first_seen) < monthAgo,
    ).length;
    const monthTrend =
      lastMonth > 0
        ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
        : thisMonth > 0
          ? 100
          : 0;

    return {
      total,
      thisWeek,
      weekTrend,
      conversionRate,
      converted,
      qualified,
      thisMonth,
      monthTrend,
    };
  }, [contacts]);

  if (isPending || !stats) return null;

  const cards = [
    {
      title: "Total Leads",
      value: stats.total.toLocaleString("fr-FR"),
      description: `${stats.thisMonth} ce mois`,
      trend: stats.monthTrend,
      icon: Users,
    },
    {
      title: "Leads cette semaine",
      value: stats.thisWeek.toLocaleString("fr-FR"),
      description: "vs semaine précédente",
      trend: stats.weekTrend,
      icon: UserPlus,
    },
    {
      title: "Taux de conversion",
      value: `${stats.conversionRate}%`,
      description: `${stats.converted} inscrits / convertis`,
      trend: null,
      icon: TrendingUp,
    },
    {
      title: "Leads qualifiés",
      value: stats.qualified.toLocaleString("fr-FR"),
      description: "en cours de qualification",
      trend: null,
      icon: CheckCircle,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{card.value}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              {card.trend !== null && (
                <span
                  className={`flex items-center ${card.trend >= 0 ? "text-emerald-600" : "text-red-500"}`}
                >
                  {card.trend >= 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {Math.abs(card.trend)}%
                </span>
              )}
              <span>{card.description}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
