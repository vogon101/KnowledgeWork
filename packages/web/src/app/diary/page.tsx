import { getDiaryEntries } from "@/lib/knowledge-base";
import { format } from "date-fns";
import Link from "next/link";

export default async function DiaryPage() {
  const entries = await getDiaryEntries();

  // Group entries by month
  const entriesByMonth = entries.reduce((acc, entry) => {
    const monthKey = `${entry.year}-${entry.month.toString().padStart(2, "0")}`;
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(entry);
    return acc;
  }, {} as Record<string, typeof entries>);

  const months = Object.keys(entriesByMonth).sort().reverse();

  return (
    <div className="p-5 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Diary</h1>
        <p className="text-[13px] text-zinc-500">Daily work logs and reflections</p>
      </div>

      <div className="space-y-8">
        {months.map((monthKey) => {
          const monthEntries = entriesByMonth[monthKey];
          const firstEntry = monthEntries[0];
          const monthDate = new Date(firstEntry.year, firstEntry.month - 1, 1);

          return (
            <div key={monthKey}>
              <h2 className="text-[13px] font-medium text-zinc-400 uppercase tracking-wider mb-3">
                {format(monthDate, "MMMM yyyy")}
              </h2>
              <div className="space-y-1">
                {monthEntries.map((entry) => (
                  <Link
                    key={entry.path}
                    href={`/diary/${entry.year}/${entry.month}/${entry.day}`}
                    className="flex items-start gap-4 p-3 -mx-3 rounded-lg hover:bg-zinc-800/50 transition-colors group"
                  >
                    <div className="w-20 flex-shrink-0">
                      <div className="text-[13px] font-medium text-zinc-300 group-hover:text-zinc-100">
                        {format(entry.date, "EEE d")}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      {entry.sections.summary ? (
                        <p className="text-[13px] text-zinc-400 group-hover:text-zinc-300 line-clamp-2">
                          {entry.sections.summary.replace(/\*\*/g, "").replace(/Timecard:.*$/, "").trim()}
                        </p>
                      ) : (
                        <p className="text-[13px] text-zinc-600 italic">No summary</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {entries.length === 0 && (
        <p className="text-[13px] text-zinc-500">No diary entries found.</p>
      )}
    </div>
  );
}
