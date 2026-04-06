import { useGetList } from "ra-core";
import { useMemo } from "react";
import { ResponsivePie } from "@nivo/pie";
import { GraduationCap } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Contact } from "../types";

// Normalize formation names that have slight variations
const normalizeFormation = (name: string): string => {
  const lower = name.toLowerCase().trim();
  if (lower.includes("acteur") && lower.includes("leader"))
    return "Acteur Leader";
  if (lower.includes("court") && (lower.includes("métrage") || lower.includes("metrage")))
    return "Court-métrage";
  if (lower.includes("doublage") || lower.includes("voix"))
    return "Doublage & Voix-Off";
  if (lower.includes("casting"))
    return "Journées Casting";
  if (lower.includes("pro tools") || lower.includes("mixage"))
    return "Pro Tools & Mixage";
  if (lower.includes("cannes"))
    return "Cannes Networking";
  return name;
};

const COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#10b981",
  "#06b6d4",
  "#eab308",
  "#ef4444",
  "#6366f1",
  "#14b8a6",
];

export const FormationInterestChart = () => {
  const { data: contacts, isPending } = useGetList<Contact>("contacts", {
    pagination: { page: 1, perPage: 5000 },
  });

  const pieData = useMemo(() => {
    if (!contacts) return [];

    const counts: Record<string, number> = {};
    contacts.forEach((c) => {
      if (!c.formation_souhaitee) return;
      const normalized = normalizeFormation(c.formation_souhaitee);
      counts[normalized] = (counts[normalized] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], index) => ({
        id: label,
        label,
        value,
        color: COLORS[index % COLORS.length],
      }));
  }, [contacts]);

  if (isPending) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">
            Intérêt par formation
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-75">
          <ResponsivePie
            data={pieData}
            margin={{ top: 20, right: 120, bottom: 20, left: 20 }}
            innerRadius={0.55}
            padAngle={1.5}
            cornerRadius={4}
            activeOuterRadiusOffset={6}
            colors={{ datum: "data.color" }}
            borderWidth={0}
            enableArcLinkLabels={false}
            arcLabelsSkipAngle={20}
            arcLabelsTextColor="#ffffff"
            arcLabel={(d) => `${((d.value / contacts!.filter(c => c.formation_souhaitee).length) * 100).toFixed(0)}%`}
            tooltip={({ datum }) => (
              <div className="bg-popover text-popover-foreground border rounded-md px-3 py-2 text-sm shadow-md">
                <strong>{datum.label}</strong>
                <br />
                {datum.value} leads ({((datum.value / contacts!.filter(c => c.formation_souhaitee).length) * 100).toFixed(1)}%)
              </div>
            )}
            legends={[
              {
                anchor: "right",
                direction: "column",
                justify: false,
                translateX: 100,
                translateY: 0,
                itemsSpacing: 4,
                itemWidth: 90,
                itemHeight: 20,
                itemDirection: "left-to-right",
                symbolSize: 10,
                symbolShape: "circle",
                itemTextColor: "var(--color-muted-foreground)",
              },
            ]}
            theme={{
              labels: {
                text: {
                  fontSize: 12,
                  fontWeight: 600,
                },
              },
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
};
