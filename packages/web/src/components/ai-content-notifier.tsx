"use client";

/**
 * AI Content Notifier
 *
 * Listens for socket.io events when AI creates content and shows
 * a toast notification with a link to open the file.
 */

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { FileText, FolderKanban, GitBranch, Users, Sparkles } from "lucide-react";

interface AIContentEvent {
  contentType: "document" | "workstream" | "project" | "meeting-notes" | "other";
  title: string;
  filePath: string;
  message?: string;
}

const contentTypeConfig = {
  document: {
    icon: FileText,
    label: "Document created",
    color: "text-blue-400",
  },
  workstream: {
    icon: GitBranch,
    label: "Workstream created",
    color: "text-teal-400",
  },
  project: {
    icon: FolderKanban,
    label: "Project created",
    color: "text-purple-400",
  },
  "meeting-notes": {
    icon: Users,
    label: "Meeting notes created",
    color: "text-amber-400",
  },
  other: {
    icon: Sparkles,
    label: "Content created",
    color: "text-zinc-400",
  },
};

export function AIContentNotifier() {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const socketRef = useRef<Socket | null>(null);

  // Keep pathname ref in sync for use in socket handler
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const taskServiceUrl =
      process.env.NEXT_PUBLIC_TASK_SERVICE_URL || "http://localhost:3004";

    // Connect to socket.io server
    const socket = io(taskServiceUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("ai:content", (event: AIContentEvent) => {
      const config = contentTypeConfig[event.contentType];
      const Icon = config.icon;

      // Show toast with action to open the file
      toast(
        <div className="flex items-start gap-3">
          <Icon className={`h-5 w-5 mt-0.5 ${config.color}`} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-zinc-200">
              {config.label}
            </p>
            <p className="text-[13px] text-zinc-300 truncate">{event.title}</p>
            {event.message && (
              <p className="text-[12px] text-zinc-500 mt-0.5">{event.message}</p>
            )}
          </div>
        </div>,
        {
          duration: 10000, // Show for 10 seconds
          action: {
            label: "Open",
            onClick: () => {
              const targetPath = `/browse/${event.filePath}`;
              if (pathnameRef.current === targetPath) {
                // Already on this page, refresh to show updated content
                router.refresh();
              } else {
                router.push(targetPath);
              }
            },
          },
          closeButton: true,
        }
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [router]);

  return null;
}
