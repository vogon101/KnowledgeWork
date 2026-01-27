"use client";

import { useState, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import type { TreeNode, FileEntry } from "@kw/api-types";

interface UseFileTreeOptions {
  /** Root path to start from (relative to KB root) */
  rootPath?: string;
  /** Whether to include hidden files */
  includeHidden?: boolean;
  /** Initial expanded paths (relative to KB root) */
  initialExpanded?: string[];
  /** Called when a file is selected */
  onFileSelect?: (entry: FileEntry) => void;
}

interface UseFileTreeReturn {
  /** Root nodes of the tree */
  nodes: TreeNode[];
  /** Set of currently expanded paths */
  expandedPaths: Set<string>;
  /** Whether initial data is loading */
  isLoading: boolean;
  /** Any error that occurred */
  error: Error | null;
  /** Toggle a folder's expanded state */
  toggleExpanded: (path: string) => void;
  /** Expand a specific path */
  expand: (path: string) => void;
  /** Collapse a specific path */
  collapse: (path: string) => void;
  /** Expand all paths */
  expandAll: () => void;
  /** Collapse all paths */
  collapseAll: () => void;
  /** Check if a path is expanded */
  isExpanded: (path: string) => boolean;
  /** Currently selected path */
  selectedPath: string | null;
  /** Set the selected path */
  setSelectedPath: (path: string | null) => void;
  /** Refresh the tree */
  refetch: () => void;
}

/**
 * Hook for managing file tree state and data fetching
 */
export function useFileTree(options: UseFileTreeOptions = {}): UseFileTreeReturn {
  const {
    rootPath = "",
    includeHidden = false,
    initialExpanded = [],
  } = options;

  // Track expanded paths
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    () => new Set(initialExpanded)
  );

  // Track selected path
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  // Fetch initial tree (depth 1)
  const { data: treeData, isLoading, error, refetch } = trpc.files.tree.useQuery(
    { path: rootPath, depth: 1, includeHidden },
    { staleTime: 30000 } // Cache for 30 seconds
  );

  // Fetch children for all expanded folders
  const expandedArray = useMemo(
    () => Array.from(expandedPaths).filter((p) => p !== rootPath),
    [expandedPaths, rootPath]
  );

  // Query for children of expanded folders
  const childQueries = trpc.useQueries((t) =>
    expandedArray.map((path) =>
      t.files.tree({ path, depth: 1, includeHidden }, { staleTime: 30000 })
    )
  );

  // Build the complete tree with expanded children
  const nodes = useMemo(() => {
    if (!treeData?.nodes) return [];

    // Create a map of path -> children
    const childrenMap = new Map<string, TreeNode[]>();
    expandedArray.forEach((path, index) => {
      const childData = childQueries[index]?.data;
      if (childData?.nodes) {
        childrenMap.set(path, childData.nodes);
      }
    });

    // Recursively merge children into the tree
    function mergeChildren(nodes: TreeNode[]): TreeNode[] {
      return nodes.map((node) => {
        if (node.type === "folder") {
          const children = childrenMap.get(node.path);
          if (children) {
            return {
              ...node,
              children: mergeChildren(children),
              expanded: true,
            };
          }
        }
        return node;
      });
    }

    return mergeChildren(treeData.nodes);
  }, [treeData?.nodes, expandedArray, childQueries]);

  // Toggle expanded state
  const toggleExpanded = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // Expand a path
  const expand = useCallback((path: string) => {
    setExpandedPaths((prev) => new Set([...prev, path]));
  }, []);

  // Collapse a path
  const collapse = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      next.delete(path);
      return next;
    });
  }, []);

  // Expand all - collect all folder paths
  const expandAll = useCallback(() => {
    const allFolders = new Set<string>();
    function collectFolders(nodes: TreeNode[]) {
      for (const node of nodes) {
        if (node.type === "folder") {
          allFolders.add(node.path);
          if (node.children) {
            collectFolders(node.children);
          }
        }
      }
    }
    collectFolders(nodes);
    setExpandedPaths(allFolders);
  }, [nodes]);

  // Collapse all
  const collapseAll = useCallback(() => {
    setExpandedPaths(new Set());
  }, []);

  // Check if expanded
  const isExpanded = useCallback(
    (path: string) => expandedPaths.has(path),
    [expandedPaths]
  );

  return {
    nodes,
    expandedPaths,
    isLoading,
    error: error as Error | null,
    toggleExpanded,
    expand,
    collapse,
    expandAll,
    collapseAll,
    isExpanded,
    selectedPath,
    setSelectedPath,
    refetch,
  };
}

/**
 * Hook for file search
 */
export function useFileSearch(options: {
  enabled?: boolean;
  path?: string;
  extensions?: string[];
  limit?: number;
} = {}) {
  const { enabled = true, path = "", extensions, limit = 20 } = options;

  const [query, setQuery] = useState("");

  const { data, isLoading, error } = trpc.files.search.useQuery(
    { query, path, extensions, limit },
    {
      enabled: enabled && query.length >= 1,
      staleTime: 10000, // Cache for 10 seconds
    }
  );

  return {
    query,
    setQuery,
    results: data?.results || [],
    isLoading: isLoading && query.length >= 1,
    error: error as Error | null,
  };
}
