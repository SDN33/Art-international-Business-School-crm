import { useGetList } from "ra-core";
import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GitBranch } from "lucide-react";
import type { Contact } from "../types";
import { useConfigurationContext } from "../root/ConfigurationContext";

export const PipelineChart = () => {
  const { dealStages } = useConfigurationContext();
  const { data: contacts, isPending } = useGetList<Contact>("contacts", {
    pagination: { page: 1, perPage: 5000 },
  });

  const stages = useMemo(() => {
    if (!contacts || !dealStages) return [];

    // Count contacts per pipeline_status
    const counts: Record<string, number> = {};
    contacts.forEach((c) => {
      const status = c.pipeline_status ?? "non-defini";
      counts[status] = (counts[status] || 0) + 1;
    });

    // Map to dealStages config for proper labels + order
    const stageData = dealStages
      .map((stage) => {
        // Match by value or label
        const count =
          counts[stage.value] || counts[stage.label] || 0;
        return {
          value: stage.value,
          label: stage.label,
          count,
        };
      })
      .filter((s) => s.count > 0);

    // Sort by count descending
    stageData.sort((a, b) => b.count - a.count);

    return stageData;
  }, [contacts, dealStages]);

  const maxCount = stages.length > 0 ? stages[0].count : 1;
  const total = stages.reduce((sum, s) => sum + s.count, 0);

  if (isPending) return null;

  // Color gradient from blue to green
  const colors = [
    "bg-blue-500",
    "bg-blue-400",
    "bg-sky-400",
    "bg-cyan-400",
    "bg-teal-400",
    "bg-emerald-400",
    "bg-green-400",
    "bg-lime-400",
    "bg-yellow-400",
    "bg-amber-400",
    "bg-orange-400",
    "bg-red-400",
    "bg-rose-400",
    "bg-pink-400",
    "bg-purple-400",
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">Pipeline des leads</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stages.map((stage, index) => {
            const pct = ((stage.count / total) * 100).toFixed(1);
            const barWidth = Math.max(
              (stage.count / maxCount) * 100,
              2,
            );
            return (
              <div key={stage.value} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate mr-2">
                    {stage.label}
                  </span>
                  <span className="text-muted-foreground whitespace-nowrap">
                    {stage.count}{" "}
                    <span className="text-xs">({pct}%)</span>
                  </span>
                </div>
                <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${colors[index % colors.length]}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-3 border-t text-sm text-muted-foreground text-center">
          {total} leads au total dans le pipeline
        </div>
      </CardContent>
    </Card>
  );
};
