"use client";

import { useState } from "react";
import { RefreshCw, Check, AlertCircle, X, Users, ListTodo } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface MeetingSyncButtonProps {
  meetingPath: string;
}

export function MeetingSyncButton({ meetingPath }: MeetingSyncButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Always fetch preview to get sync status
  const previewQuery = trpc.sync.meetingPreview.useQuery(
    { path: meetingPath }
  );

  const isSynced = previewQuery.data?.isSynced ?? false;

  const syncMutation = trpc.sync.meeting.useMutation({
    onSuccess: (data) => {
      setResult({
        success: true,
        message: `${data.tasksCreated} created, ${data.tasksUpdated} updated`,
      });
      setShowModal(false);
      // Refresh page after a short delay
      setTimeout(() => window.location.reload(), 1000);
    },
    onError: (error) => {
      setResult({ success: false, message: error.message || "Failed to sync" });
    },
  });

  const handleOpenModal = () => {
    setResult(null);
    setShowModal(true);
  };

  const handleSync = () => {
    syncMutation.mutate({ path: meetingPath });
  };

  const syncing = syncMutation.isPending;
  const initialLoading = previewQuery.isLoading;
  const preview = previewQuery.data;

  // Button styling based on sync status
  const buttonClass = initialLoading
    ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-500"
    : isSynced
    ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
    : "bg-red-900/50 hover:bg-red-800/50 text-red-300 border border-red-700/50";

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={handleOpenModal}
          disabled={syncing || initialLoading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] transition-colors disabled:opacity-50 ${buttonClass}`}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing || initialLoading ? "animate-spin" : ""}`} />
          {initialLoading ? "Checking..." : isSynced ? "Synced" : "Not Synced"}
        </button>
        {result && !showModal && (
          <span className={`text-[11px] flex items-center gap-1 ${result.success ? "text-emerald-400" : "text-red-400"}`}>
            {result.success ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
            {result.message}
          </span>
        )}
      </div>

      {/* Preview Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <h3 className="text-sm font-medium text-zinc-200">Sync Meeting</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {initialLoading && (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-5 w-5 animate-spin text-zinc-500" />
                </div>
              )}

              {previewQuery.error && (
                <div className="text-red-400 text-sm">
                  Error loading preview: {previewQuery.error.message}
                </div>
              )}

              {preview && (
                <>
                  {/* Meeting info */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Meeting</h4>
                    <p className="text-sm text-zinc-300">{preview.title}</p>
                    <p className="text-xs text-zinc-500">{preview.date}</p>
                  </div>

                  {/* Attendees */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="h-3 w-3" />
                      Attendees ({preview.attendees.length})
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {preview.attendees.map((attendee) => (
                        <span
                          key={attendee}
                          className="px-2 py-0.5 text-xs rounded bg-zinc-800 text-zinc-300"
                        >
                          {attendee}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-zinc-500">
                      Will be linked to this meeting on their People pages
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                      <ListTodo className="h-3 w-3" />
                      Actions ({preview.actionsCount})
                    </h4>

                    {preview.actions.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic">No actions in this meeting</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-auto">
                        {preview.actions.map((action, i) => (
                          <div
                            key={i}
                            className={`p-2 rounded text-xs ${
                              action.wouldCreate
                                ? "bg-emerald-900/30 border border-emerald-700/30"
                                : "bg-zinc-800/50 border border-zinc-700/30"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                action.wouldCreate
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "bg-zinc-600/50 text-zinc-400"
                              }`}>
                                {action.wouldCreate ? "CREATE" : "SKIP"}
                              </span>
                              <span className="text-zinc-400">{action.owner}</span>
                              {action.existingTaskId && (
                                <span className="text-zinc-500">T-{action.existingTaskId}</span>
                              )}
                            </div>
                            <p className="text-zinc-300">{action.action}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {preview.actionsCount > 0 && (
                      <div className="flex gap-4 text-xs text-zinc-500 pt-1">
                        <span className="text-emerald-400">{preview.wouldCreate} to create</span>
                        <span>{preview.wouldSkip} to skip</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-zinc-800 bg-zinc-900/50">
              <button
                onClick={() => setShowModal(false)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSync}
                disabled={syncing || initialLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing..." : "Sync Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
