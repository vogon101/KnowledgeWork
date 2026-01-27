"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  FileText,
  Folder,
  Pencil,
  Search,
  X,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { FileTree } from "@/components/file-tree";
import { Markdown } from "@/components/markdown";
import { Input } from "@/components/ui/input";
import {
  FileContextMenuProvider,
  useFileContextMenu,
} from "@/components/file-context-menu";
import type { FileEntry, TreeNode } from "@kw/api-types";

interface BrowseViewProps {
  /** Current path (relative to KB root) */
  path: string;
  /** Show sidebar tree */
  showSidebar?: boolean;
}

export function BrowseView({ path, showSidebar = true }: BrowseViewProps) {
  return (
    <FileContextMenuProvider linkPrefix="/browse">
      <BrowseViewInner path={path} showSidebar={showSidebar} />
    </FileContextMenuProvider>
  );
}

// Common file extensions for quick detection
const FILE_EXTENSIONS = new Set([
  "md", "txt", "json", "yaml", "yml", "toml", "xml", "csv",
  "js", "ts", "tsx", "jsx", "py", "rb", "go", "rs", "java",
  "html", "css", "scss", "less", "svg", "png", "jpg", "jpeg", "gif",
  "sh", "bash", "zsh", "fish", "ps1", "bat", "cmd",
  "sql", "graphql", "prisma", "env", "gitignore", "dockerignore",
]);

function looksLikeFile(path: string): boolean {
  if (!path) return false;
  const lastPart = path.split("/").pop() || "";
  const dotIndex = lastPart.lastIndexOf(".");
  if (dotIndex === -1 || dotIndex === 0) return false;
  const ext = lastPart.slice(dotIndex + 1).toLowerCase();
  return FILE_EXTENSIONS.has(ext);
}

function BrowseViewInner({ path, showSidebar = true }: BrowseViewProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(showSidebar);
  const [filter, setFilter] = useState("");
  const { openMenu } = useFileContextMenu();

  // Determine likely content type from path
  const pathLooksLikeFile = looksLikeFile(path);

  // Fetch directory listing (skip if path looks like a file)
  const {
    data: listData,
    isLoading: listLoading,
    error: listError,
  } = trpc.files.list.useQuery(
    { path, includeHidden: false },
    { enabled: !pathLooksLikeFile }
  );

  // Fetch file content (if path looks like a file, or if list failed)
  const shouldFetchFile = pathLooksLikeFile || !!listError;
  const {
    data: fileData,
    isLoading: fileLoading,
    error: fileError,
  } = trpc.files.get.useQuery(
    { path },
    {
      enabled: shouldFetchFile,
      retry: false,
    }
  );

  // Determine content type
  const isDirectory = !!listData && !listError;
  const isFile = !!fileData && !fileError;
  const isLoading = (!pathLooksLikeFile && listLoading) || (shouldFetchFile && fileLoading);

  // Filter entries
  const filteredEntries = useMemo(() => {
    if (!listData?.entries) return [];
    if (!filter) return listData.entries;

    const lowerFilter = filter.toLowerCase();
    return listData.entries.filter(
      (entry) =>
        entry.name.toLowerCase().includes(lowerFilter) ||
        entry.frontmatterTitle?.toLowerCase().includes(lowerFilter)
    );
  }, [listData?.entries, filter]);

  // Separate folders and files
  const folders = filteredEntries.filter((e) => e.type === "folder");
  const files = filteredEntries.filter((e) => e.type === "file");

  // Breadcrumb parts
  const pathParts = path ? path.split("/").filter(Boolean) : [];

  // Handle file selection from tree
  const handleFileSelect = useCallback(
    (entry: FileEntry) => {
      router.push(`/browse/${entry.path}`);
    },
    [router]
  );

  // Context menu handler
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, node: TreeNode) => {
      openMenu(e, node);
    },
    [openMenu]
  );

  if (isLoading) {
    return (
      <div className="flex h-full">
        {sidebarOpen && (
          <div className="w-64 border-r border-zinc-800/50 p-4">
            <div className="h-4 w-24 bg-zinc-800/50 rounded animate-pulse" />
          </div>
        )}
        <div className="flex-1 p-5">
          <div className="h-6 w-32 bg-zinc-800/50 rounded animate-pulse mb-4" />
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-10 bg-zinc-800/30 rounded animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isDirectory && !isFile) {
    return (
      <div className="p-5">
        <p className="text-[13px] text-red-400">
          Path not found: {path || "/"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-64 border-r border-zinc-800/50 flex flex-col bg-zinc-900/30">
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-zinc-800/50">
            <span className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider">
              Files
            </span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded transition-colors"
              title="Close sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <FileTree
              rootPath=""
              showControls={true}
              title=""
              maxHeight="calc(100vh - 120px)"
              linkPrefix="/browse"
              onFileSelect={handleFileSelect}
              onContextMenu={handleContextMenu}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {/* Sidebar toggle when closed */}
        {!sidebarOpen && (
          <div className="sticky top-0 z-10 p-2 bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800/50">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 text-zinc-500 hover:text-zinc-300 bg-zinc-800/50 hover:bg-zinc-800 rounded transition-colors"
              title="Open sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          </div>
        )}

        {isDirectory ? (
          <DirectoryContent
            path={path}
            pathParts={pathParts}
            folders={folders}
            files={files}
            filter={filter}
            setFilter={setFilter}
            totalEntries={listData?.entries.length || 0}
            filteredCount={filteredEntries.length}
          />
        ) : isFile && fileData ? (
          <FileContent
            path={path}
            pathParts={pathParts}
            content={fileData.content}
            frontmatter={fileData.frontmatter}
            metadata={fileData.metadata}
          />
        ) : null}
      </div>
    </div>
  );
}

// Directory view component
function DirectoryContent({
  path,
  pathParts,
  folders,
  files,
  filter,
  setFilter,
  totalEntries,
  filteredCount,
}: {
  path: string;
  pathParts: string[];
  folders: FileEntry[];
  files: FileEntry[];
  filter: string;
  setFilter: (v: string) => void;
  totalEntries: number;
  filteredCount: number;
}) {
  const currentFolder = pathParts[pathParts.length - 1] || "Browse";

  return (
    <div className="p-5 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb pathParts={pathParts} />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{currentFolder}</h1>
          <p className="text-[13px] text-zinc-500">{path || "/"}</p>
        </div>

        {/* Filter input */}
        {totalEntries > 5 && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              type="text"
              placeholder="Filter..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-8 pr-8 h-8 w-48 bg-zinc-800/50 border-zinc-700/50 text-[13px]"
            />
            {filter && (
              <button
                onClick={() => setFilter("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Filter status */}
      {filter && (
        <p className="text-[12px] text-zinc-500">
          Showing {filteredCount} of {totalEntries} items
        </p>
      )}

      {/* Folders */}
      {folders.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-[12px] font-medium text-zinc-500 uppercase tracking-wider">
            Folders ({folders.length})
          </h2>
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {folders.map((folder) => (
              <Link
                key={folder.path}
                href={`/browse/${folder.path}`}
                className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-zinc-800/50 transition-colors group"
              >
                <Folder className="h-4 w-4 text-amber-500/80" />
                <span className="text-[13px] text-zinc-300 group-hover:text-zinc-100 truncate">
                  {folder.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Files */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-[12px] font-medium text-zinc-500 uppercase tracking-wider">
            Files ({files.length})
          </h2>
          <div className="space-y-0.5">
            {files.map((file) => (
              <Link
                key={file.path}
                href={`/browse/${file.path}`}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors group"
              >
                <FileText className="h-4 w-4 text-zinc-500" />
                <span className="text-[13px] text-zinc-300 group-hover:text-zinc-100 flex-1 truncate">
                  {file.frontmatterTitle || file.name}
                </span>
                {file.frontmatterTitle && file.frontmatterTitle !== file.name && (
                  <span className="text-[11px] text-zinc-600">{file.name}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {folders.length === 0 && files.length === 0 && (
        <p className="text-[13px] text-zinc-500">
          {filter ? "No items match your filter." : "This folder is empty."}
        </p>
      )}
    </div>
  );
}

// File view component
function FileContent({
  path,
  pathParts,
  content,
  frontmatter,
  metadata,
}: {
  path: string;
  pathParts: string[];
  content: string;
  frontmatter?: Record<string, unknown>;
  metadata: {
    size: number;
    mtime: string;
    extension: string;
    isMarkdown: boolean;
  };
}) {
  const fileName = pathParts.pop() || "";
  const folderParts = pathParts;

  return (
    <div className="p-5 space-y-5 max-w-4xl">
      {/* Breadcrumb */}
      <Breadcrumb pathParts={folderParts} currentFile={fileName} />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{fileName}</h1>
          <p className="text-[13px] text-zinc-500">{path}</p>
        </div>
        {metadata.isMarkdown && (
          <Link
            href={`/edit/${path}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Link>
        )}
      </div>

      {/* Frontmatter */}
      {frontmatter && Object.keys(frontmatter).length > 0 && (
        <div className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-800/50">
          <h2 className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider mb-3">
            Metadata
          </h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
            {Object.entries(frontmatter).map(([key, value]) => (
              <div key={key} className="flex flex-col">
                <dt className="text-zinc-500">{key}</dt>
                <dd className="text-zinc-300">
                  {Array.isArray(value) ? value.join(", ") : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Content */}
      <div className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-800/50">
        {metadata.isMarkdown ? (
          <Markdown content={content} className="text-[13px] text-zinc-300" />
        ) : (
          <pre className="text-[12px] overflow-x-auto whitespace-pre-wrap font-mono text-zinc-300">
            {content}
          </pre>
        )}
      </div>
    </div>
  );
}

// Breadcrumb component
function Breadcrumb({
  pathParts,
  currentFile,
}: {
  pathParts: string[];
  currentFile?: string;
}) {
  return (
    <div className="flex items-center gap-1 text-[12px] text-zinc-500 flex-wrap">
      <Link href="/browse" className="hover:text-zinc-300">
        Browse
      </Link>
      {pathParts.map((part, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3" />
          {i === pathParts.length - 1 && !currentFile ? (
            <span className="text-zinc-300">{part}</span>
          ) : (
            <Link
              href={`/browse/${pathParts.slice(0, i + 1).join("/")}`}
              className="hover:text-zinc-300"
            >
              {part}
            </Link>
          )}
        </span>
      ))}
      {currentFile && (
        <span className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3" />
          <span className="text-zinc-300">{currentFile}</span>
        </span>
      )}
    </div>
  );
}

// Export the root browse page content as a separate component
export function BrowseRootView() {
  return <BrowseView path="" showSidebar={true} />;
}
