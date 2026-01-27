"use client";

import { memo, useCallback } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  FileText,
  File,
  FileCode,
  FileJson,
  FileImage,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TreeNode } from "@kw/api-types";

// Map file extensions to icons
const FILE_ICONS: Record<string, typeof File> = {
  ".md": FileText,
  ".txt": FileText,
  ".json": FileJson,
  ".js": FileCode,
  ".ts": FileCode,
  ".tsx": FileCode,
  ".jsx": FileCode,
  ".py": FileCode,
  ".sh": FileCode,
  ".yml": FileCode,
  ".yaml": FileCode,
  ".png": FileImage,
  ".jpg": FileImage,
  ".jpeg": FileImage,
  ".gif": FileImage,
  ".svg": FileImage,
  ".webp": FileImage,
};

function getFileIcon(extension?: string) {
  return FILE_ICONS[extension || ""] || File;
}

interface FileTreeItemProps {
  node: TreeNode;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  isLoading?: boolean;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  linkPrefix?: string;
  onContextMenu?: (e: React.MouseEvent, node: TreeNode) => void;
}

export const FileTreeItem = memo(function FileTreeItem({
  node,
  depth,
  isExpanded,
  isSelected,
  isLoading,
  onToggle,
  onSelect,
  linkPrefix = "/browse",
  onContextMenu,
}: FileTreeItemProps) {
  const isFolder = node.type === "folder";
  const FileIcon = isFolder
    ? isExpanded
      ? FolderOpen
      : Folder
    : getFileIcon(node.extension);

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isFolder) {
        onToggle(node.path);
      }
    },
    [isFolder, node.path, onToggle]
  );

  const handleSelect = useCallback(() => {
    onSelect(node.path);
  }, [node.path, onSelect]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (onContextMenu) {
        e.preventDefault();
        onContextMenu(e, node);
      }
    },
    [node, onContextMenu]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (isFolder) {
          onToggle(node.path);
        } else {
          onSelect(node.path);
        }
      }
      if (e.key === "ArrowRight" && isFolder && !isExpanded) {
        e.preventDefault();
        onToggle(node.path);
      }
      if (e.key === "ArrowLeft" && isFolder && isExpanded) {
        e.preventDefault();
        onToggle(node.path);
      }
    },
    [isFolder, isExpanded, node.path, onToggle, onSelect]
  );

  const displayName = node.frontmatterTitle || node.name;

  const content = (
    <div
      role="treeitem"
      aria-expanded={isFolder ? isExpanded : undefined}
      aria-selected={isSelected}
      tabIndex={0}
      className={cn(
        "flex items-center gap-1.5 py-1 px-2 rounded-md cursor-pointer transition-colors",
        "hover:bg-zinc-800/50 focus:outline-none focus:ring-1 focus:ring-zinc-600",
        isSelected && "bg-zinc-800/70"
      )}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      onClick={handleSelect}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
    >
      {/* Expand/collapse chevron for folders */}
      {isFolder ? (
        <button
          onClick={handleToggle}
          className="p-0.5 -m-0.5 hover:bg-zinc-700/50 rounded transition-colors"
          aria-label={isExpanded ? "Collapse folder" : "Expand folder"}
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 text-zinc-500 animate-spin" />
          ) : (
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 text-zinc-500 transition-transform",
                isExpanded && "rotate-90"
              )}
            />
          )}
        </button>
      ) : (
        <span className="w-3.5" /> // Spacer for alignment
      )}

      {/* File/folder icon */}
      <FileIcon
        className={cn(
          "h-4 w-4 flex-shrink-0",
          isFolder ? "text-amber-500/80" : "text-zinc-500"
        )}
      />

      {/* Name */}
      <span
        className={cn(
          "text-[13px] truncate",
          isFolder ? "text-zinc-300" : "text-zinc-400",
          isSelected && "text-zinc-100"
        )}
        title={node.path}
      >
        {displayName}
      </span>
    </div>
  );

  // Wrap both files and folders in links for navigation
  return (
    <Link href={`${linkPrefix}/${node.path}`} className="block">
      {content}
    </Link>
  );
});

interface FileTreeChildrenProps {
  nodes: TreeNode[];
  depth: number;
  expandedPaths: Set<string>;
  selectedPath: string | null;
  loadingPaths?: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  linkPrefix?: string;
  onContextMenu?: (e: React.MouseEvent, node: TreeNode) => void;
}

export const FileTreeChildren = memo(function FileTreeChildren({
  nodes,
  depth,
  expandedPaths,
  selectedPath,
  loadingPaths,
  onToggle,
  onSelect,
  linkPrefix,
  onContextMenu,
}: FileTreeChildrenProps) {
  return (
    <div role="group">
      {nodes.map((node) => {
        const isExpanded = expandedPaths.has(node.path);
        const isSelected = selectedPath === node.path;
        const isLoading = loadingPaths?.has(node.path);

        return (
          <div key={node.path}>
            <FileTreeItem
              node={node}
              depth={depth}
              isExpanded={isExpanded}
              isSelected={isSelected}
              isLoading={isLoading}
              onToggle={onToggle}
              onSelect={onSelect}
              linkPrefix={linkPrefix}
              onContextMenu={onContextMenu}
            />
            {node.type === "folder" && isExpanded && node.children && (
              <FileTreeChildren
                nodes={node.children}
                depth={depth + 1}
                expandedPaths={expandedPaths}
                selectedPath={selectedPath}
                loadingPaths={loadingPaths}
                onToggle={onToggle}
                onSelect={onSelect}
                linkPrefix={linkPrefix}
                onContextMenu={onContextMenu}
              />
            )}
          </div>
        );
      })}
    </div>
  );
});
