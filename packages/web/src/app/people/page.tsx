import Link from "next/link";
import { Users, Mail, Building2, ArrowLeft } from "lucide-react";
import { getPeopleWithTaskCounts, isTaskDbAvailable } from "@/lib/task-db";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  if (!isTaskDbAvailable()) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-4">People</h1>
        <div className="text-zinc-500">
          Task database not available. Run the task service to enable people tracking.
        </div>
      </div>
    );
  }

  const people = getPeopleWithTaskCounts();

  // Group by org
  const byOrg = people.reduce((acc, person) => {
    const org = person.org || "Other";
    if (!acc[org]) acc[org] = [];
    acc[org].push(person);
    return acc;
  }, {} as Record<string, typeof people>);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-950/50 px-6 py-5">
        <div className="flex items-center gap-3 mb-2">
          <Link
            href="/tasks"
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">People</h1>
        </div>
        <p className="text-[13px] text-zinc-500">
          {people.length} people across {Object.keys(byOrg).length} organisations
        </p>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        {people.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No people in the database yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(byOrg).map(([org, orgPeople]) => (
              <div key={org}>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-4 w-4 text-zinc-500" />
                  <h2 className="text-[12px] font-medium uppercase tracking-wider text-zinc-500">
                    {org}
                  </h2>
                  <span className="text-[11px] text-zinc-600">({orgPeople.length})</span>
                </div>
                <div className="grid gap-2">
                  {orgPeople.map((person) => (
                    <Link
                      key={person.id}
                      href={`/people/${person.id}`}
                      className="group flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:bg-zinc-800/50 hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center text-[13px] font-medium text-zinc-400">
                          {person.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <div className="text-[14px] text-zinc-200">{person.name}</div>
                          {person.email && (
                            <div className="text-[11px] text-zinc-500 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {person.email}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {person.owned_tasks > 0 && (
                          <Badge variant="primary" size="md">
                            {person.owned_tasks} owned
                          </Badge>
                        )}
                        {person.waiting_on_tasks > 0 && (
                          <Badge variant="warning" size="md">
                            {person.waiting_on_tasks} owed
                          </Badge>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
