"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Loader2, FolderTree, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFileTree } from "./use-file-tree";
import { FileTreeChildren } from "./file-tree-item";
import type { TreeNode, FileEntry } from "@kw/api-types";

interface FileTreeProps {
  /** Root path to start from (relative to KB root) */
  rootPath?: string;
  /** Whether to include hidden files */
  includeHidden?: boolean;
  /** Initial expanded paths */
  initialExpanded?: string[];
  /** Called when a file is selected */
  onFileSelect?: (entry: FileEntry) => void;
  /** Link prefix for file navigation */
  linkPrefix?: string;
  /** Additional class name */
  className?: string;
  /** Show expand/collapse all controls */
  showControls?: boolean;
  /** Header title */
  title?: string;
  /** Maximum height before scrolling */
  maxHeight?: string;
  /** Called when context menu is opened on a file/folder */
  onContextMenu?: (e: React.MouseEvent, node: TreeNode) => void;
}

export function FileTree({
  rootPath = "",
  includeHidden = false,
  initialExpanded = [],
  onFileSelect,
  linkPrefix = "/browse",
  className,
  showControls = true,
  title,
  maxHeight = "400px",
  onContextMenu,
}: FileTreeProps) {
  const {
    nodes,
    expandedPaths,
    isLoading,
    error,
    toggleExpanded,
    expandAll,
    collapseAll,
    selectedPath,
    setSelectedPath,
    refetch,
  } = useFileTree({
    rootPath,
    includeHidden,
    initialExpanded,
    onFileSelect,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  // Flatten nodes for keyboard navigation
  const flattenNodes = useCallback(
    (nodes: TreeNode[], result: TreeNode[] = []): TreeNode[] => {
      for (const node of nodes) {
        result.push(node);
        if (node.type === "folder" && expandedPaths.has(node.path) && node.children) {
          flattenNodes(node.children, result);
        }
      }
      return result;
    },
    [expandedPaths]
  );

  const flatNodes = flattenNodes(nodes);

  // Keyboard navigation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, flatNodes.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [flatNodes.length]);

  // Focus management
  useEffect(() => {
    if (focusedIndex >= 0 && focusedIndex < flatNodes.length) {
      const path = flatNodes[focusedIndex].path;
      setSelectedPath(path);
    }
  }, [focusedIndex, flatNodes, setSelectedPath]);

  const handleSelect = useCallback(
    (path: string) => {
      setSelectedPath(path);
      const node = flatNodes.find((n) => n.path === path);
      if (node && onFileSelect) {
        onFileSelect(node);
      }
    },
    [flatNodes, onFileSelect, setSelectedPath]
  );

  if (error) {
    return (
      <div className={cn("p-4 text-center", className)}>
        <p className="text-[13px] text-red-400">Failed to load files</p>
        <p className="text-[12px] text-zinc-500 mt-1">{error.message}</p>
        <button
          onClick={() => refetch()}
          className="mt-2 text-[12px] text-zinc-400 hover:text-zinc-200 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header */}
      {(title || showControls) && (
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-zinc-800/50">
          <div className="flex items-center gap-2">
            <FolderTree className="h-4 w-4 text-zinc-500" />
            {title && (
              <span className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider">
                {title}
              </span>
            )}
          </div>

          {showControls && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => refetch()}
                className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded transition-colors"
                title="Refresh"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={expandAll}
                className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded transition-colors"
                title="Expand all"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={collapseAll}
                className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded transition-colors"
                title="Collapse all"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tree content */}
      <div
        ref={containerRef}
        className="overflow-auto"
        style={{ maxHeight }}
        role="tree"
        tabIndex={0}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 text-zinc-500 animate-spin" />
          </div>
        ) : nodes.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-[13px] text-zinc-500">No files found</p>
          </div>
        ) : (
          <div className="py-1">
            <FileTreeChildren
              nodes={nodes}
              depth={0}
              expandedPaths={expandedPaths}
              selectedPath={selectedPath}
              onToggle={toggleExpanded}
              onSelect={handleSelect}
              linkPrefix={linkPrefix}
              onContextMenu={onContextMenu}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Re-export types and hooks
export { useFileTree, useFileSearch } from "./use-file-tree";
export type { TreeNode, FileEntry };
