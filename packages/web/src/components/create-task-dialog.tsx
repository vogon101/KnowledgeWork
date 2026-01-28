"use client";

import { useState, useEffect, useRef } from "react";
import {
  Calendar,
  Flag,
  Folder,
  User,
  Plus,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseTaskInput } from "@/lib/date-parser";
import { Combobox } from "@/components/ui/combobox";
import { trpc } from "@/lib/trpc";
import { TaskDetailModal } from "@/components/task-detail-popover";
import { SmartTaskInput, type SmartTaskInputRef } from "@/components/smart-task-input";

interface CreateTaskDialogProps {
  children?: React.ReactNode;
  onTaskCreated?: (taskId: number) => void;
  defaultProjectId?: number;
  defaultOwnerId?: number;
  // Controlled mode props
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // If true, opens the task detail modal after creation
  openDetailOnCreate?: boolean;
}

export function CreateTaskDialog({
  children,
  onTaskCreated,
  defaultProjectId,
  defaultOwnerId,
  open: controlledOpen,
  onOpenChange,
  openDetailOnCreate = true,
}: CreateTaskDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [createdTaskId, setCreatedTaskId] = useState<number | null>(null);
  const [createdTaskDisplayId, setCreatedTaskDisplayId] = useState<string | null>(null);
  const [showTokenWarning, setShowTokenWarning] = useState(false);
  const smartInputRef = useRef<SmartTaskInputRef>(null);

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<string>("_none");
  const [projectId, setProjectId] = useState<string>(defaultProjectId ? String(defaultProjectId) : "_none");
  const [ownerId, setOwnerId] = useState<string>(defaultOwnerId ? String(defaultOwnerId) : "_none");
  const [blockedByTaskId, setBlockedByTaskId] = useState<string>("_none");
  const [error, setError] = useState<string | null>(null);

  // tRPC queries for reference data
  const projectsQuery = trpc.projects.list.useQuery(undefined, { enabled: open });
  const peopleQuery = trpc.people.list.useQuery(undefined, { enabled: open });
  const tasksQuery = trpc.items.list.useQuery(
    { includeCompleted: false, limit: 200 },
    { enabled: open }
  );

  // tRPC mutation for adding blocker
  const addBlockerMutation = trpc.items.addBlocker.useMutation();

  // tRPC mutation for creating task
  const createMutation = trpc.items.create.useMutation({
    onSuccess: async (data) => {
      // If a blocker was selected, add the blocker relationship
      if (blockedByTaskId && blockedByTaskId !== "_none") {
        await addBlockerMutation.mutateAsync({
          itemId: data.id,
          blockerId: parseInt(blockedByTaskId, 10),
        });
      }
      setOpen(false);
      onTaskCreated?.(data.id);

      // Open the task detail modal after creation if enabled
      if (openDetailOnCreate) {
        setCreatedTaskId(data.id);
        setCreatedTaskDisplayId(data.displayId);
      }
    },
    onError: (error) => {
      setError(error.message || "Failed to create task");
    },
  });

  const loading = createMutation.isPending;

  // Extract data from queries
  const projects = projectsQuery.data?.projects || [];
  const people = peopleQuery.data?.people || [];
  const allTasks = (tasksQuery.data?.items || []).map(t => ({
    id: t.id,
    displayId: t.displayId,
    title: t.title,
  }));

  // Reset form when closed
  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setDueDate("");
      setPriority("_none");
      setProjectId(defaultProjectId ? String(defaultProjectId) : "_none");
      setOwnerId(defaultOwnerId ? String(defaultOwnerId) : "_none");
      setBlockedByTaskId("_none");
      setError(null);
      setShowTokenWarning(false);
    }
  }, [open, defaultProjectId, defaultOwnerId]);

  const handleTitleBlur = () => {
    const parsed = parseTaskInput(title);
    if (parsed.dueDate && !dueDate) {
      setDueDate(parsed.dueDate);
    }
    if (parsed.priority && priority === "_none") {
      setPriority(String(parsed.priority));
    }
    if (parsed.title !== title) {
      setTitle(parsed.title);
    }
  };

  const handleCreate = (force = false) => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    // Check for unactioned tokens
    if (!force && smartInputRef.current?.hasUnactionedToken()) {
      setShowTokenWarning(true);
      return;
    }

    setError(null);

    createMutation.mutate({
      title: title.trim(),
      description: description || undefined,
      status: blockedByTaskId && blockedByTaskId !== "_none" ? "blocked" : "pending",
      dueDate: dueDate || undefined,
      priority: priority && priority !== "_none" ? parseInt(priority, 10) : undefined,
      projectId: projectId && projectId !== "_none" ? parseInt(projectId, 10) : undefined,
      ownerId: ownerId && ownerId !== "_none" ? parseInt(ownerId, 10) : undefined,
      // Blocker is added via items.addBlocker API in onSuccess callback
    });
  };

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Only render trigger when not in controlled mode */}
      {!isControlled && (
        <DialogTrigger asChild>
          {children || (
            <button className="flex items-center gap-1 px-3 py-1.5 text-[12px] bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors">
              <Plus className="h-4 w-4" />
              New Task
            </button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md p-0 bg-zinc-900 border-zinc-700">
        <DialogTitle className="sr-only">Create New Task</DialogTitle>
        <div className="px-4 py-3 border-b border-zinc-800">
          <h3 className="text-[14px] font-medium text-zinc-100">New Task</h3>
        </div>

        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">
              Title *
            </label>
            <SmartTaskInput
              ref={smartInputRef}
              value={title}
              onChange={(newTitle) => {
                setTitle(newTitle);
                setShowTokenWarning(false);
              }}
              onBlur={handleTitleBlur}
              placeholder="What needs to be done? (try '@me', '#project', 'p1', '!tomorrow')"
              autoFocus
              people={people}
              projects={projects}
              onPersonSelect={(personId) => setOwnerId(personId ? String(personId) : "_none")}
              onProjectSelect={(projectId) => setProjectId(projectId ? String(projectId) : "_none")}
              onPrioritySelect={(p) => setPriority(p ? String(p) : "_none")}
              onDateSelect={(date) => setDueDate(date || "")}
              defaultUserId={defaultOwnerId}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleCreate();
                }
              }}
            />
            <p className="text-[9px] text-zinc-600 mt-0.5">
              @me/@none, #project, p1-p4, !tomorrow/!monday/!jan15 for dates
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              rows={2}
              className="w-full px-2 py-1.5 text-[12px] bg-zinc-800 border border-zinc-700 rounded text-zinc-200 placeholder:text-zinc-500 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Due Date & Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Due Date
              </label>
              <DatePicker
                value={dueDate}
                onChange={setDueDate}
                placeholder="Set due date"
              />
            </div>

            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Flag className="h-3 w-3" />
                Priority
              </label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  <SelectItem value="1">
                    <span className="text-red-400">P1 - Urgent</span>
                  </SelectItem>
                  <SelectItem value="2">
                    <span className="text-orange-400">P2 - High</span>
                  </SelectItem>
                  <SelectItem value="3">
                    <span className="text-yellow-400">P3 - Medium</span>
                  </SelectItem>
                  <SelectItem value="4">
                    <span className="text-zinc-400">P4 - Low</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Project & Owner row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Folder className="h-3 w-3" />
                Project
              </label>
              <Combobox
                options={[
                  { value: "_none", label: "No project" },
                  // Sort projects: general projects first within each org, then alphabetically
                  ...projects
                    .slice()
                    .sort((a, b) => {
                      // Same org: general first, then alphabetical
                      if (a.org === b.org) {
                        if (a.isGeneral && !b.isGeneral) return -1;
                        if (!a.isGeneral && b.isGeneral) return 1;
                        return a.name.localeCompare(b.name);
                      }
                      // Different orgs: alphabetical by org
                      return (a.org || "").localeCompare(b.org || "");
                    })
                    .map((p) => {
                      const orgLabel = p.org === "example-org" ? "ExOrg" : p.org === "acme-corp" ? "YA" : p.org;
                      return {
                        value: String(p.id),
                        // General projects show as "Org (General)" to make them obvious
                        label: p.isGeneral ? `${orgLabel} (General)` : p.name,
                        group: orgLabel,
                      };
                    }),
                ]}
                value={projectId}
                onValueChange={setProjectId}
                placeholder="Select project..."
                searchPlaceholder="Search projects..."
                emptyText="No projects found"
              />
            </div>

            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <User className="h-3 w-3" />
                Owner
              </label>
              <Combobox
                options={[
                  { value: "_none", label: "Unassigned" },
                  ...people.map((p) => ({
                    value: String(p.id),
                    label: p.name,
                  })),
                ]}
                value={ownerId}
                onValueChange={setOwnerId}
                placeholder="Select owner..."
                searchPlaceholder="Search people..."
                emptyText="No people found"
              />
            </div>
          </div>

          {/* Blocked By Task */}
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Blocked By Task
            </label>
            <Combobox
              options={[
                { value: "_none", label: "No blocking task" },
                ...allTasks.map((t) => ({
                  value: String(t.id),
                  label: `${t.displayId}: ${t.title}`,
                })),
              ]}
              value={blockedByTaskId}
              onValueChange={setBlockedByTaskId}
              placeholder="Select blocking task..."
              searchPlaceholder="Search tasks..."
              emptyText="No tasks found"
            />
            <p className="text-[9px] text-zinc-600 mt-0.5">Set this if another task must complete first</p>
          </div>

          {error && (
            <div className="text-[11px] text-red-400 bg-red-500/10 px-2 py-1 rounded">
              {error}
            </div>
          )}

          {showTokenWarning && (
            <div className="text-[11px] text-amber-400 bg-amber-500/10 px-2 py-1.5 rounded border border-amber-500/30">
              <p className="font-medium mb-1">Unfinished mention detected</p>
              <p className="text-amber-300/80">
                You have a {smartInputRef.current?.getUnactionedTokenType() === "person" ? "@person" : "#project"} mention that hasn&apos;t been selected.
                Select from the dropdown or remove the token.
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setShowTokenWarning(false)}
                  className="px-2 py-1 text-[10px] bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded"
                >
                  Go back
                </button>
                <button
                  onClick={() => handleCreate(true)}
                  className="px-2 py-1 text-[10px] bg-amber-600 hover:bg-amber-500 text-white rounded"
                >
                  Create anyway
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 text-[11px] text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              onClick={() => handleCreate()}
              disabled={loading || !title.trim()}
              className="flex items-center gap-1 px-3 py-1.5 text-[11px] bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              Create Task
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Task Detail Modal - opens after task creation */}
    {createdTaskId && createdTaskDisplayId && (
      <TaskDetailModal
        taskId={createdTaskId}
        displayId={createdTaskDisplayId}
        open={true}
        onOpenChange={(open) => {
          if (!open) {
            setCreatedTaskId(null);
            setCreatedTaskDisplayId(null);
          }
        }}
      />
    )}
  </>
  );
}
