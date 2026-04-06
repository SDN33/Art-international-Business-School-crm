import { useGetList } from "ra-core";
import { useMemo } from "react";
import { ResponsiveLine } from "@nivo/line";
import { format, subDays, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Activity } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Contact } from "../types";

const DAYS_RANGE = 30;

export const LeadAcquisitionChart = () => {
  const { data: contacts, isPending } = useGetList<Contact>("contacts", {
    pagination: { page: 1, perPage: 5000 },
    sort: { field: "first_seen", order: "DESC" },
  });

  const chartData = useMemo(() => {
    if (!contacts) return [];

    const now = startOfDay(new Date());

    // Initialize all days with 0
    const dayCounts: Record<string, number> = {};
    for (let i = 0; i <= DAYS_RANGE; i++) {
      const day = subDays(now, DAYS_RANGE - i);
      dayCounts[format(day, "yyyy-MM-dd")] = 0;
    }

    // Count contacts per day
    contacts.forEach((c) => {
      if (!c.first_seen) return;
      const day = format(startOfDay(new Date(c.first_seen)), "yyyy-MM-dd");
      if (day in dayCounts) {
        dayCounts[day]++;
      }
    });

    return [
      {
        id: "leads",
        data: Object.entries(dayCounts).map(([date, count]) => ({
          x: date,
          y: count,
        })),
      },
    ];
  }, [contacts]);

  const totalPeriod = useMemo(() => {
    if (!chartData.length) return 0;
    return chartData[0].data.reduce((sum, d) => sum + (d.y as number), 0);
  }, [chartData]);

  const avgPerDay = useMemo(() => {
    if (!chartData.length) return 0;
    return Math.round(totalPeriod / DAYS_RANGE);
  }, [totalPeriod, chartData]);

  if (isPending) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">
              Acquisition de leads (30 jours)
            </CardTitle>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>
              Total:{" "}
              <strong className="text-foreground">{totalPeriod}</strong>
            </span>
            <span>
              Moy/jour:{" "}
              <strong className="text-foreground">{avgPerDay}</strong>
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-70">
          <ResponsiveLine
            data={chartData}
            margin={{ top: 10, right: 20, bottom: 40, left: 40 }}
            xScale={{ type: "point" }}
            yScale={{
              type: "linear",
              min: 0,
              max: "auto",
            }}
            curve="monotoneX"
            colors={["#3b82f6"]}
            lineWidth={2}
            pointSize={4}
            pointColor="#3b82f6"
            pointBorderWidth={0}
            enableArea={true}
            areaOpacity={0.1}
            enableGridX={false}
            enableGridY={true}
            axisBottom={{
              tickSize: 0,
              tickPadding: 8,
              tickRotation: -45,
              format: (value: string) => {
                const d = new Date(value);
                return format(d, "dd MMM", { locale: fr });
              },
              tickValues: chartData[0]?.data
                .filter((_, i) => i % 5 === 0)
                .map((d) => d.x),
            }}
            axisLeft={{
              tickSize: 0,
              tickPadding: 8,
              tickValues: 5,
            }}
            tooltip={({ point }) => (
              <div className="bg-popover text-popover-foreground border rounded-md px-3 py-2 text-sm shadow-md">
                <strong>
                  {format(new Date(point.data.xFormatted as string), "d MMMM yyyy", {
                    locale: fr,
                  })}
                </strong>
                <br />
                {point.data.yFormatted} leads
              </div>
            )}
            theme={{
              axis: {
                ticks: {
                  text: {
                    fill: "var(--color-muted-foreground)",
                    fontSize: 11,
                  },
                },
              },
              grid: {
                line: {
                  stroke: "var(--color-border)",
                  strokeWidth: 1,
                },
              },
              crosshair: {
                line: {
                  stroke: "var(--color-muted-foreground)",
                  strokeWidth: 1,
                  strokeOpacity: 0.5,
                },
              },
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
};
