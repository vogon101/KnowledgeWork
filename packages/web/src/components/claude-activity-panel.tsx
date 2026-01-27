"use client";

import Link from "next/link";
import { ArrowRight, Terminal } from "lucide-react";
import { ActivityFeed } from "./activity-feed";

export function ClaudeActivityPanel() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5" />
          Claude Code
        </h2>
        <Link
          href="/terminal"
          className="text-[12px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
        >
          Terminal <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-800/50">
        <ActivityFeed limit={5} compact stream />
      </div>
    </div>
  );
}
