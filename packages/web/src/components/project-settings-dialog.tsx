"use client";

import { useState, useEffect } from "react";
import { Settings, Loader2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";

interface ProjectSettingsDialogProps {
  projectSlug: string;
  projectOrg: string;
  children?: React.ReactNode;
  onSaved?: () => void;
}

const STATUS_OPTIONS = [
  { value: "_none", label: "No Status" },
  { value: "active", label: "Active" },
  { value: "planning", label: "Planning" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

const PRIORITY_OPTIONS = [
  { value: "_none", label: "No Priority" },
  { value: "1", label: "P1 - Critical" },
  { value: "2", label: "P2 - High" },
  { value: "3", label: "P3 - Medium" },
  { value: "4", label: "P4 - Low" },
];

export function ProjectSettingsDialog({
  projectSlug,
  projectOrg,
  children,
  onSaved,
}: ProjectSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("_none");
  const [priority, setPriority] = useState("_none");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();

  // Fetch project data when dialog opens
  const projectQuery = trpc.projects.get.useQuery(
    { slug: projectSlug, org: projectOrg },
    { enabled: open }
  );

  // Update form when project data loads
  useEffect(() => {
    if (projectQuery.data) {
      setName(projectQuery.data.name);
      setStatus(projectQuery.data.status || "_none");
      setPriority(projectQuery.data.priority ? String(projectQuery.data.priority) : "_none");
      setDescription(projectQuery.data.description || "");
    }
  }, [projectQuery.data]);

  const updateMutation = trpc.projects.update.useMutation({
    onSuccess: () => {
      setOpen(false);
      utils.projects.invalidate();
      onSaved?.();
    },
    onError: (error) => {
      setError(error.message || "Failed to update project");
    },
  });

  const handleSave = () => {
    if (!projectQuery.data?.id) {
      setError("Project not found in database");
      return;
    }
    setError(null);
    updateMutation.mutate({
      id: projectQuery.data.id,
      data: {
        name: name.trim() || undefined,
        status: status === "_none" ? null : (status as "active" | "planning" | "paused" | "completed" | "archived"),
        priority: priority === "_none" ? null : parseInt(priority),
        description: description.trim() || null,
      },
    });
  };

  const loading = updateMutation.isPending || projectQuery.isLoading;
  const notInDb = open && !projectQuery.isLoading && !projectQuery.data;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
            <Settings className="h-3.5 w-3.5" />
            Settings
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-700">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Project Settings</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[12px]">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {notInDb && (
          <div className="flex items-center gap-2 px-3 py-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[12px]">
            <AlertCircle className="h-4 w-4" />
            Project not found in database. Run a sync to populate project data.
          </div>
        )}

        {projectQuery.isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 text-zinc-400 animate-spin" />
          </div>
        )}

        {projectQuery.data && <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-[13px] bg-zinc-800 border border-zinc-700 rounded text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Project name"
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              Status
            </label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full bg-zinc-800 border-zinc-700 text-[13px]">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-[13px]">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              Priority
            </label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-full bg-zinc-800 border-zinc-700 text-[13px]">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {PRIORITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-[13px]">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-[13px] bg-zinc-800 border border-zinc-700 rounded text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              placeholder="Brief project description..."
            />
          </div>
        </div>}

        <DialogFooter>
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-2 text-[13px] text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !name.trim() || !projectQuery.data}
            className="flex items-center gap-2 px-4 py-2 text-[13px] bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
