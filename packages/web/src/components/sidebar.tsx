"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
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
  PanelLeftClose,
  PanelLeftOpen,
  Columns2,
  Layers,
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
  const {
    toggle: toggleTerminal,
    isOpen: terminalOpen,
    layoutMode,
    setLayoutMode,
    showWebUI,
    sidebarCollapsed: collapsed,
    setSidebarCollapsed,
  } = useTerminal();

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`${collapsed ? "w-14" : "w-52"} border-r border-border/50 bg-zinc-950 flex flex-col fixed h-screen transition-all duration-200`}
    >
      {!collapsed && (
        <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
          <Logo size={18} />
          <h1 className="font-semibold text-sm tracking-tight">Knowledge Work</h1>
        </div>
      )}
      {collapsed && <div className="py-3 border-b border-border/50" />}
      <nav className={`flex-1 ${collapsed ? "p-1" : "p-2"} space-y-0.5`}>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (layoutMode === "tabbed") showWebUI();
              }}
              className={`flex items-center ${collapsed ? "justify-center" : "gap-2.5"} ${collapsed ? "px-1.5" : "px-2.5"} py-1.5 rounded-md text-[13px] transition-colors ${
                active
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className={`h-3.5 w-3.5 flex-shrink-0 ${active ? "text-zinc-100" : ""}`} />
              {!collapsed && item.label}
            </Link>
          );
        })}

        {/* Terminal toggle */}
        <button
          onClick={toggleTerminal}
          className={`w-full flex items-center ${collapsed ? "justify-center" : "gap-2.5"} ${collapsed ? "px-1.5" : "px-2.5"} py-1.5 rounded-md text-[13px] transition-colors ${
            terminalOpen
              ? "bg-zinc-800 text-zinc-100"
              : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
          }`}
          title={collapsed ? "Terminal (⌘\\)" : undefined}
        >
          <Terminal className={`h-3.5 w-3.5 flex-shrink-0 ${terminalOpen ? "text-zinc-100" : ""}`} />
          {!collapsed && (
            <>
              Terminal
              <kbd className="ml-auto px-1 py-0.5 bg-zinc-800 rounded text-[9px] font-mono text-zinc-500">⌘\</kbd>
            </>
          )}
        </button>
      </nav>
      <div className={`${collapsed ? "px-1" : "px-2"} py-2 border-t border-border/50 space-y-1`}>
        {/* Layout mode toggle */}
        <button
          onClick={() => setLayoutMode(layoutMode === "split" ? "tabbed" : "split")}
          className="w-full flex items-center justify-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
          title={layoutMode === "split" ? "Switch to tabbed layout" : "Switch to split layout"}
        >
          {layoutMode === "split" ? (
            <Layers className="h-3.5 w-3.5 flex-shrink-0" />
          ) : (
            <Columns2 className="h-3.5 w-3.5 flex-shrink-0" />
          )}
          {!collapsed && (
            <span className="flex-1 text-left">{layoutMode === "split" ? "Tabbed" : "Split"}</span>
          )}
        </button>
        {/* Sidebar collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-3.5 w-3.5 flex-shrink-0" />
          ) : (
            <PanelLeftClose className="h-3.5 w-3.5 flex-shrink-0" />
          )}
          {!collapsed && <span className="flex-1 text-left">Collapse</span>}
        </button>
      </div>
      {!collapsed && (
        <div className="px-4 py-3 border-t border-border/50">
          <div className="flex items-center gap-2 text-[11px] text-zinc-500">
            <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px] font-mono">⌘K</kbd>
            <span>Quick search</span>
          </div>
        </div>
      )}
    </aside>
  );
}
