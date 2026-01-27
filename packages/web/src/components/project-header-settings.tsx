"use client";

import { Settings } from "lucide-react";
import { ProjectSettingsDialog } from "./project-settings-dialog";
import { OrgSettingsDialog } from "./org-settings-dialog";

interface ProjectHeaderSettingsProps {
  projectSlug: string;
  projectOrg: string;
  isWorkstream?: boolean;
}

export function ProjectHeaderSettings({
  projectSlug,
  projectOrg,
  isWorkstream = false,
}: ProjectHeaderSettingsProps) {
  return (
    <div className="flex items-center gap-2">
      <ProjectSettingsDialog
        projectSlug={projectSlug}
        projectOrg={projectOrg}
      >
        <button
          className="flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-700 transition-colors"
          title={`Edit ${isWorkstream ? "workstream" : "project"} settings`}
        >
          <Settings className="h-3.5 w-3.5" />
          {isWorkstream ? "Workstream" : "Project"}
        </button>
      </ProjectSettingsDialog>

      <OrgSettingsDialog orgSlug={projectOrg}>
        <button
          className="flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-700 transition-colors"
          title="Edit organization settings"
        >
          <Settings className="h-3.5 w-3.5" />
          Org
        </button>
      </OrgSettingsDialog>
    </div>
  );
}
