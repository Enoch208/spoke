import { Calendar03Icon } from "@hugeicons/core-free-icons";
import type { ClientOutput } from "@spoke/protocol";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { fill } from "@/lib/copy";
import { formatDateTime } from "@/lib/format";
import { Callout } from "../shared/callout";
import { statusCopy } from "./status-copy";

type Status = ClientOutput<"system.status">;
type Incident = Status["incidents"][number];

const dayMs = 86_400_000;

const severityTone = { degraded: "amber", outage: "pink", maintenance: "sky" } as const;

function IncidentCard({ incident }: { incident: Incident }) {
  const updates = [...incident.updates].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-ink text-base font-medium">{incident.title}</h3>
        <StatusChip
          label={statusCopy.severity[incident.severity]}
          icon={Calendar03Icon}
          tone={severityTone[incident.severity]}
        />
      </div>
      <p className="text-body text-sm">{incident.impact}</p>
      <p className="text-subtle text-sm">
        {fill(statusCopy.started, { date: formatDateTime(new Date(incident.startsAt)) })}
        {incident.endsAt
          ? ` · ${fill(statusCopy.resolved, { date: formatDateTime(new Date(incident.endsAt)) })}`
          : ""}
      </p>
      {updates.length > 0 ? (
        <ol className="border-hairline flex flex-col gap-2 border-l pl-4">
          {updates.map((update) => (
            <li key={update.at} className="text-sm">
              <span className="text-subtle">{formatDateTime(new Date(update.at))}</span>
              <p className="text-body">{update.message}</p>
            </li>
          ))}
        </ol>
      ) : null}
    </Card>
  );
}

export function ActiveIncidents({ status, now }: { status: Status; now: number }) {
  const active = status.incidents.filter(
    (incident) => incident.endsAt === null || Date.parse(incident.endsAt) > now,
  );
  const maintenance = status.maintenanceWindow;
  return (
    <>
      {maintenance && Date.parse(maintenance.to) > now ? (
        <Callout tone="info">
          {fill(statusCopy.maintenance, {
            start: formatDateTime(new Date(maintenance.from)),
            end: formatDateTime(new Date(maintenance.to)),
          })}
        </Callout>
      ) : null}
      {active.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-h4 text-ink font-medium">
            {statusCopy.incidentsHeading}
          </h2>
          {active.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} />
          ))}
        </section>
      ) : null}
    </>
  );
}

export function PastIncidents({ status, now }: { status: Status; now: number }) {
  const past = status.incidents.filter(
    (incident) =>
      incident.endsAt !== null &&
      Date.parse(incident.endsAt) <= now &&
      now - Date.parse(incident.endsAt) <= 30 * dayMs,
  );
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-h4 text-ink font-medium">{statusCopy.pastHeading}</h2>
      {past.length === 0 ? (
        <p className="text-subtle text-sm">{statusCopy.noPast}</p>
      ) : (
        past.map((incident) => <IncidentCard key={incident.id} incident={incident} />)
      )}
    </section>
  );
}
