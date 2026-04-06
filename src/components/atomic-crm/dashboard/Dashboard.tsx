import { useGetList } from "ra-core";

import type { Contact, ContactNote } from "../types";
import { DashboardActivityLog } from "./DashboardActivityLog";
import { DashboardStepper } from "./DashboardStepper";
import { DealsChart } from "./DealsChart";
import { FormationInterestChart } from "./FormationInterestChart";
import { Formations } from "./Formations";
import { HotContacts } from "./HotContacts";
import { KpiCards } from "./KpiCards";
import { LeadAcquisitionChart } from "./LeadAcquisitionChart";
import { PipelineChart } from "./PipelineChart";
import { TasksList } from "./TasksList";
import { Welcome } from "./Welcome";

export const Dashboard = () => {
  const {
    data: dataContact,
    total: totalContact,
    isPending: isPendingContact,
  } = useGetList<Contact>("contacts", {
    pagination: { page: 1, perPage: 1 },
  });

  const { total: totalContactNotes, isPending: isPendingContactNotes } =
    useGetList<ContactNote>("contact_notes", {
      pagination: { page: 1, perPage: 1 },
    });

  const { total: totalDeal, isPending: isPendingDeal } = useGetList<Contact>(
    "deals",
    {
      pagination: { page: 1, perPage: 1 },
    },
  );

  const isPending = isPendingContact || isPendingContactNotes || isPendingDeal;

  if (isPending) {
    return null;
  }

  if (!totalContact) {
    return (
      <div className="flex flex-col gap-8">
        <DashboardStepper step={1} />
        <Formations />
      </div>
    );
  }

  if (!totalContactNotes) {
    return (
      <div className="flex flex-col gap-8">
        <DashboardStepper step={2} contactId={dataContact?.[0]?.id} />
        <Formations />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 mt-1">
      {/* KPI Summary Cards */}
      <KpiCards />

      {/* Charts Row: Lead Acquisition + Formation Interest */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LeadAcquisitionChart />
        <FormationInterestChart />
      </div>

      {/* Pipeline + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PipelineChart />
        <div className="lg:col-span-2">
          {totalDeal ? <DealsChart /> : null}
        </div>
      </div>

      {/* Original sections */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-3">
          <div className="flex flex-col gap-4">
            {import.meta.env.VITE_IS_DEMO === "true" ? <Welcome /> : null}
            <HotContacts />
          </div>
        </div>
        <div className="md:col-span-6">
          <DashboardActivityLog />
        </div>
        <div className="md:col-span-3">
          <TasksList />
        </div>
      </div>
      <Formations />
    </div>
  );
};
