import { getDiaryEntry, getDiaryEntries } from "@/lib/knowledge-base";
import { format } from "date-fns";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";

interface Props {
  params: Promise<{
    year: string;
    month: string;
    day: string;
  }>;
}

export async function generateStaticParams() {
  const entries = await getDiaryEntries();
  return entries.map((entry) => ({
    year: entry.year.toString(),
    month: entry.month.toString(),
    day: entry.day.toString(),
  }));
}

export default async function DiaryEntryPage({ params }: Props) {
  const { year, month, day } = await params;
  const entry = await getDiaryEntry(
    parseInt(year, 10),
    parseInt(month, 10),
    parseInt(day, 10)
  );

  if (!entry) {
    notFound();
  }

  // Get adjacent entries for navigation
  const allEntries = await getDiaryEntries();
  const currentIndex = allEntries.findIndex(
    (e) => e.year === entry.year && e.month === entry.month && e.day === entry.day
  );
  const prevEntry = currentIndex < allEntries.length - 1 ? allEntries[currentIndex + 1] : null;
  const nextEntry = currentIndex > 0 ? allEntries[currentIndex - 1] : null;

  return (
    <div className="p-5 space-y-5 max-w-4xl">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/diary"
            className="text-[12px] text-zinc-500 hover:text-zinc-300 mb-1 inline-block"
          >
            ← Diary
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">
            {format(entry.date, "EEEE, d MMMM yyyy")}
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/edit/${entry.path}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors mr-2"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Link>
          {prevEntry && (
            <Link
              href={`/diary/${prevEntry.year}/${prevEntry.month}/${prevEntry.day}`}
              className="p-2 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-zinc-200"
              title={format(prevEntry.date, "d MMM")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
          )}
          {nextEntry && (
            <Link
              href={`/diary/${nextEntry.year}/${nextEntry.month}/${nextEntry.day}`}
              className="p-2 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-zinc-200"
              title={format(nextEntry.date, "d MMM")}
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Summary */}
      {entry.sections.summary && (
        <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-800">
          <Markdown content={entry.sections.summary} className="text-[13px] text-zinc-300 leading-relaxed" />
        </div>
      )}

      {/* Tasks grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tasks for Today */}
        {entry.sections.tasksForToday && (
          <Section title="Tasks for Today">
            <Markdown content={entry.sections.tasksForToday} />
          </Section>
        )}

        {/* Tasks Completed */}
        {entry.sections.tasksCompleted && (
          <Section title="Completed">
            <Markdown content={entry.sections.tasksCompleted} />
          </Section>
        )}
      </div>

      {/* Work Log */}
      {entry.sections.workLog && (
        <Section title="Work Log">
          <Markdown content={entry.sections.workLog} />
        </Section>
      )}

      {/* Meetings */}
      {entry.sections.meetings && (
        <Section title="Meetings">
          <Markdown content={entry.sections.meetings} />
        </Section>
      )}

      {/* Reflections */}
      {entry.sections.reflections && (
        <Section title="Reflections">
          <Markdown content={entry.sections.reflections} />
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-800/50">
      <h2 className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider mb-3">
        {title}
      </h2>
      <div className="text-[13px] text-zinc-300">
        {children}
      </div>
    </div>
  );
}
