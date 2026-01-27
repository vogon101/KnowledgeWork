"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  RefreshCw,
  FolderPlus,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";

interface SyncConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  type: "all";
}

export function SyncConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
}: SyncConfirmationModalProps) {
  const [confirming, setConfirming] = useState(false);

  // Fetch preview using tRPC
  const previewQuery = trpc.sync.allPreview.useQuery(undefined, {
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      setConfirming(false);
    }
  }, [open]);

  const handleConfirm = async () => {
    setConfirming(true);
    await onConfirm();
    setConfirming(false);
    onOpenChange(false);
  };

  const preview = previewQuery.data;
  const hasChanges = preview && preview.workstreams.count > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 bg-zinc-900 border-zinc-700 max-h-[80vh] flex flex-col">
        <DialogTitle className="sr-only">
          Sync All Preview
        </DialogTitle>

        <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-blue-400" />
          <h3 className="text-[14px] font-medium text-zinc-100">
            Sync All - Preview Changes
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {previewQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
              <span className="ml-2 text-zinc-500">Loading preview...</span>
            </div>
          ) : previewQuery.isError ? (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 mx-auto text-red-400 mb-2" />
              <p className="text-red-400">{previewQuery.error.message}</p>
              <button
                onClick={() => previewQuery.refetch()}
                className="mt-3 text-[12px] text-blue-400 hover:text-blue-300"
              >
                Try again
              </button>
            </div>
          ) : preview ? (
            <div className="space-y-4">
              {!hasChanges ? (
                <div className="text-center py-6">
                  <CheckCircle className="h-8 w-8 mx-auto text-emerald-400 mb-2" />
                  <p className="text-zinc-300">Everything is up to date!</p>
                  <p className="text-[12px] text-zinc-500 mt-1">
                    No workstream files to sync.
                  </p>
                </div>
              ) : (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
                      <div className="flex items-center gap-2 mb-1">
                        <FolderPlus className="h-4 w-4 text-blue-400" />
                        <span className="text-[11px] text-zinc-500 uppercase">Workstreams</span>
                      </div>
                      <div className="text-xl font-semibold text-zinc-200">
                        {preview.workstreams.count}
                        <span className="text-[12px] text-zinc-500 font-normal ml-1">files</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
                      <div className="flex items-center gap-2 mb-1">
                        <FolderPlus className="h-4 w-4 text-amber-400" />
                        <span className="text-[11px] text-zinc-500 uppercase">Meetings</span>
                      </div>
                      <div className="text-xl font-semibold text-zinc-200">
                        {preview.meetings.count}
                        <span className="text-[12px] text-zinc-500 font-normal ml-1">synced</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[12px] text-zinc-500">
                    This will sync workstream files from the filesystem to the database.
                    Meeting sync is done individually via the web interface.
                  </p>
                </>
              )}
            </div>
          ) : null}
        </div>

        {/* Actions */}
        <div className="px-4 py-3 border-t border-zinc-800 flex justify-end gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="px-3 py-1.5 text-[11px] text-zinc-400 hover:text-zinc-200"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={previewQuery.isLoading || confirming || !hasChanges}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50"
          >
            {confirming ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            {hasChanges ? "Sync Workstreams" : "Nothing to sync"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
