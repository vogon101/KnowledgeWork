"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Copy,
  FolderOpen,
  FileCode,
  Eye,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { TreeNode, FileEntry } from "@kw/api-types";

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  node: TreeNode | FileEntry | null;
}

interface FileContextMenuProps {
  children: React.ReactNode;
  linkPrefix?: string;
}

interface MenuItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

function MenuItem({ icon: Icon, label, onClick, disabled }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 w-full px-2 py-1.5 text-[13px] text-left rounded",
        "hover:bg-zinc-700/50 transition-colors",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <Icon className="h-4 w-4 text-zinc-500" />
      <span className="text-zinc-300">{label}</span>
    </button>
  );
}

export function FileContextMenuProvider({
  children,
  linkPrefix = "/browse",
}: FileContextMenuProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    node: null,
  });

  // Close menu on click outside
  useEffect(() => {
    if (!menu.isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu((prev) => ({ ...prev, isOpen: false }));
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu((prev) => ({ ...prev, isOpen: false }));
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menu.isOpen]);

  const openMenu = useCallback((e: React.MouseEvent, node: TreeNode | FileEntry) => {
    e.preventDefault();
    e.stopPropagation();

    // Position the menu at click location, but keep it in viewport
    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = Math.min(e.clientY, window.innerHeight - 200);

    setMenu({
      isOpen: true,
      x,
      y,
      node,
    });
  }, []);

  const closeMenu = useCallback(() => {
    setMenu((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Actions
  const handleOpen = useCallback(() => {
    if (!menu.node) return;
    router.push(`${linkPrefix}/${menu.node.path}`);
    closeMenu();
  }, [menu.node, router, linkPrefix, closeMenu]);

  const handleCopyPath = useCallback(async () => {
    if (!menu.node) return;
    try {
      await navigator.clipboard.writeText(menu.node.path);
      toast.success("Path copied to clipboard");
    } catch {
      toast.error("Failed to copy path");
    }
    closeMenu();
  }, [menu.node, closeMenu]);

  const handleOpenContainingFolder = useCallback(() => {
    if (!menu.node) return;
    const parts = menu.node.path.split("/");
    parts.pop(); // Remove filename
    const folderPath = parts.join("/");
    router.push(`${linkPrefix}/${folderPath}`);
    closeMenu();
  }, [menu.node, router, linkPrefix, closeMenu]);

  const handleViewRaw = useCallback(() => {
    if (!menu.node) return;
    // Open in new tab with raw view (would need to implement raw endpoint)
    // For now, just open the file
    window.open(`${linkPrefix}/${menu.node.path}?raw=true`, "_blank");
    closeMenu();
  }, [menu.node, linkPrefix, closeMenu]);

  const handleEdit = useCallback(() => {
    if (!menu.node) return;
    router.push(`/edit/${menu.node.path}`);
    closeMenu();
  }, [menu.node, router, closeMenu]);

  const isFolder = menu.node?.type === "folder";
  const isMarkdown = !isFolder && menu.node?.path.endsWith(".md");

  return (
    <FileContextMenuContext.Provider value={{ openMenu }}>
      {children}

      {/* Context Menu */}
      {menu.isOpen && menu.node && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[180px] rounded-md border border-zinc-700 bg-zinc-800/95 backdrop-blur-sm p-1 shadow-lg animate-in fade-in-0 zoom-in-95"
          style={{ left: menu.x, top: menu.y }}
        >
          {/* File/Folder name header */}
          <div className="px-2 py-1.5 text-[11px] text-zinc-500 border-b border-zinc-700/50 mb-1 truncate">
            {menu.node.name}
          </div>

          <MenuItem
            icon={isFolder ? FolderOpen : Eye}
            label={isFolder ? "Open folder" : "Open file"}
            onClick={handleOpen}
          />

          <MenuItem icon={Copy} label="Copy path" onClick={handleCopyPath} />

          {!isFolder && (
            <MenuItem
              icon={ExternalLink}
              label="Open containing folder"
              onClick={handleOpenContainingFolder}
            />
          )}

          {!isFolder && (
            <MenuItem
              icon={FileCode}
              label="View raw"
              onClick={handleViewRaw}
            />
          )}

          {isMarkdown && (
            <>
              <div className="my-1 border-t border-zinc-700/50" />
              <MenuItem icon={Pencil} label="Edit" onClick={handleEdit} />
            </>
          )}
        </div>
      )}
    </FileContextMenuContext.Provider>
  );
}

// Context for passing the openMenu function down
import { createContext, useContext } from "react";

interface FileContextMenuContextValue {
  openMenu: (e: React.MouseEvent, node: TreeNode | FileEntry) => void;
}

const FileContextMenuContext = createContext<FileContextMenuContextValue | null>(
  null
);

export function useFileContextMenu() {
  const context = useContext(FileContextMenuContext);
  if (!context) {
    throw new Error(
      "useFileContextMenu must be used within a FileContextMenuProvider"
    );
  }
  return context;
}
