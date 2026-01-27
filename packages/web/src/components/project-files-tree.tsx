"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { FileTree } from "@/components/file-tree";
import {
  FileContextMenuProvider,
  useFileContextMenu,
} from "@/components/file-context-menu";
import type { FileEntry, TreeNode } from "@kw/api-types";

interface ProjectFilesTreeProps {
  /** Project folder path relative to KB root */
  projectPath: string;
  /** Maximum height before scrolling */
  maxHeight?: string;
  /** Title for the tree header */
  title?: string;
}

export function ProjectFilesTree({
  projectPath,
  maxHeight = "300px",
  title = "Files",
}: ProjectFilesTreeProps) {
  return (
    <FileContextMenuProvider linkPrefix="/browse">
      <ProjectFilesTreeInner
        projectPath={projectPath}
        maxHeight={maxHeight}
        title={title}
      />
    </FileContextMenuProvider>
  );
}

function ProjectFilesTreeInner({
  projectPath,
  maxHeight,
  title,
}: ProjectFilesTreeProps) {
  const router = useRouter();
  const { openMenu } = useFileContextMenu();

  const handleFileSelect = useCallback(
    (entry: FileEntry) => {
      router.push(`/browse/${entry.path}`);
    },
    [router]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, node: TreeNode) => {
      openMenu(e, node);
    },
    [openMenu]
  );

  return (
    <div className="rounded-lg bg-zinc-800/30 border border-zinc-800/50 overflow-hidden">
      <FileTree
        rootPath={projectPath}
        showControls={true}
        title={title}
        maxHeight={maxHeight}
        linkPrefix="/browse"
        onFileSelect={handleFileSelect}
        onContextMenu={handleContextMenu}
        className="bg-transparent"
      />
    </div>
  );
}
