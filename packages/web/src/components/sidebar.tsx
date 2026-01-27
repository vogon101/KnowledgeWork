"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  FolderKanban,
  Users,
  UserCircle,
  Search,
  FileText,
  Terminal,
  StickyNote,
  CheckSquare,
  Settings,
  Clock,
} from "lucide-react";
import { useTerminal } from "./terminal-sidebar";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/diary", icon: Calendar, label: "Diary" },
  { href: "/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/people", icon: UserCircle, label: "People" },
  { href: "/projects", icon: FolderKanban, label: "Projects" },
  { href: "/meetings", icon: Users, label: "Meetings" },
  { href: "/quick-notes", icon: StickyNote, label: "Quick Notes" },
  { href: "/timecard", icon: Clock, label: "Timecard" },
  { href: "/browse", icon: FileText, label: "Browse" },
  { href: "/search", icon: Search, label: "Search" },
  { href: "/system", icon: Settings, label: "System" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { toggle: toggleTerminal, isOpen: terminalOpen } = useTerminal();

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-52 border-r border-border/50 bg-zinc-950 flex flex-col fixed h-screen">
      <div className="px-4 py-3 border-b border-border/50">
        <h1 className="font-semibold text-sm tracking-tight">Knowledge Work</h1>
      </div>
      <nav className="flex-1 p-2 space-y-0.5">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors ${
                active
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
              }`}
            >
              <item.icon className={`h-3.5 w-3.5 ${active ? "text-zinc-100" : ""}`} />
              {item.label}
            </Link>
          );
        })}

        {/* Terminal toggle */}
        <button
          onClick={toggleTerminal}
          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors ${
            terminalOpen
              ? "bg-zinc-800 text-zinc-100"
              : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
          }`}
        >
          <Terminal className={`h-3.5 w-3.5 ${terminalOpen ? "text-zinc-100" : ""}`} />
          Terminal
          <kbd className="ml-auto px-1 py-0.5 bg-zinc-800 rounded text-[9px] font-mono text-zinc-500">⌘\</kbd>
        </button>
      </nav>
      <div className="px-4 py-3 border-t border-border/50">
        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
          <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px] font-mono">⌘K</kbd>
          <span>Quick search</span>
        </div>
      </div>
    </aside>
  );
}
