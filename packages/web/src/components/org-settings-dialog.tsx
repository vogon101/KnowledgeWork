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
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";

interface OrgSettingsDialogProps {
  orgSlug: string;
  children?: React.ReactNode;
  onSaved?: () => void;
}

const COLOR_OPTIONS: { value: "indigo" | "teal" | "rose" | "orange"; label: string }[] = [
  { value: "indigo", label: "Indigo" },
  { value: "teal", label: "Teal" },
  { value: "rose", label: "Rose" },
  { value: "orange", label: "Orange" },
];

export function OrgSettingsDialog({
  orgSlug,
  children,
  onSaved,
}: OrgSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<"indigo" | "teal" | "rose" | "orange">("indigo");
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();

  // Fetch org data when dialog opens
  const orgQuery = trpc.organizations.get.useQuery(
    { slug: orgSlug },
    { enabled: open }
  );

  // Update form when org data loads
  useEffect(() => {
    if (orgQuery.data) {
      setName(orgQuery.data.name);
      setShortName(orgQuery.data.shortName || "");
      setDescription(orgQuery.data.description || "");
      setColor((orgQuery.data.color as typeof color) || "indigo");
    }
  }, [orgQuery.data]);

  const updateMutation = trpc.organizations.update.useMutation({
    onSuccess: () => {
      setOpen(false);
      utils.organizations.invalidate();
      utils.projects.invalidate(); // Refresh projects to show updated org info
      onSaved?.();
    },
    onError: (error) => {
      setError(error.message || "Failed to update organization");
    },
  });

  const handleSave = () => {
    setError(null);
    updateMutation.mutate({
      slug: orgSlug,
      data: {
        name: name.trim() || undefined,
        shortName: shortName.trim() || null,
        description: description.trim() || null,
        color: color,
      },
    });
  };

  const loading = updateMutation.isPending || orgQuery.isLoading;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
            <Settings className="h-3.5 w-3.5" />
            Org Settings
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-700">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Organization Settings</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[12px]">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="space-y-4 py-2">
          {/* Slug (read-only) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              Slug
            </label>
            <input
              type="text"
              value={orgSlug}
              disabled
              className="w-full px-3 py-2 text-[13px] bg-zinc-800/50 border border-zinc-700/50 rounded text-zinc-500 cursor-not-allowed"
            />
          </div>

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
              placeholder="Organization name"
            />
          </div>

          {/* Short Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              Short Name
            </label>
            <input
              type="text"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              maxLength={5}
              className="w-full px-3 py-2 text-[13px] bg-zinc-800 border border-zinc-700 rounded text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., YA, CBP"
            />
            <p className="text-[10px] text-zinc-500">Short name shown in badges (max 5 chars)</p>
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              Badge Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setColor(opt.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded border transition-colors ${
                    color === opt.value
                      ? "border-blue-500 bg-zinc-800"
                      : "border-zinc-700 hover:border-zinc-600"
                  }`}
                >
                  <Badge variant={opt.value} size="md">
                    {shortName || orgSlug.slice(0, 3).toUpperCase()}
                  </Badge>
                  <span className="text-[12px] text-zinc-400">{opt.label}</span>
                </button>
              ))}
            </div>
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
              placeholder="Brief organization description..."
            />
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-2 text-[13px] text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !name.trim()}
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
