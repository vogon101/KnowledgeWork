/**
 * Files Router (tRPC)
 *
 * Type-safe API for browsing and reading files in the knowledge base.
 * All operations are read-only and paths are validated to stay within KB.
 */

import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc.js';
import {
  FileListInputSchema,
  FileTreeInputSchema,
  FileSearchInputSchema,
  FileGetInputSchema,
  type FileEntry,
  type TreeNode,
  type FileSearchResult,
  type FileContent,
} from '@kw/api-types';
import {
  getKnowledgeBasePath,
  resolveKBPath,
  getRelativeKBPath,
  isWithinKB,
} from '../../services/paths.js';
import { existsSync, readFileSync, readdirSync, statSync, Dirent } from 'fs';
import { join, extname, dirname } from 'path';
import matter from 'gray-matter';

// =============================================================================
// HELPERS
// =============================================================================

/** Files/folders to always exclude */
const EXCLUDED_NAMES = new Set([
  'node_modules',
  'venv',
  '.venv',
  '__pycache__',
  '.git',
  '.DS_Store',
  'Thumbs.db',
]);

/**
 * Check if a file/folder should be excluded
 */
function shouldExclude(name: string, includeHidden: boolean): boolean {
  if (EXCLUDED_NAMES.has(name)) return true;
  if (!includeHidden && name.startsWith('.')) return true;
  return false;
}

/**
 * Validate that a path is within the knowledge base
 */
function validatePath(relativePath: string): string {
  const absolutePath = resolveKBPath(relativePath);

  if (!isWithinKB(absolutePath)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Path is outside knowledge base',
    });
  }

  return absolutePath;
}

/**
 * Get frontmatter title from a markdown file (if any)
 */
function getFrontmatterTitle(absolutePath: string): string | null {
  try {
    if (!absolutePath.endsWith('.md')) return null;

    const content = readFileSync(absolutePath, 'utf-8');
    const { data } = matter(content);

    return data.title || null;
  } catch {
    return null;
  }
}

/**
 * Convert a directory entry to a FileEntry
 * Handles symlinks by following them to determine target type
 */
function toFileEntry(
  dirEntry: Dirent,
  parentPath: string,
): FileEntry {
  const name = dirEntry.name;
  const relativePath = parentPath ? `${parentPath}/${name}` : name;
  const absolutePath = resolveKBPath(relativePath);

  // Determine if this is a file or folder
  // For symlinks, follow them to get the target type
  let isFile: boolean;
  if (dirEntry.isSymbolicLink()) {
    try {
      // statSync follows symlinks, so we can check the target
      const stat = statSync(absolutePath);
      isFile = stat.isFile();
    } catch {
      // Broken symlink - treat as file
      isFile = true;
    }
  } else {
    isFile = dirEntry.isFile();
  }

  const entry: FileEntry = {
    name,
    path: relativePath,
    type: isFile ? 'file' : 'folder',
  };

  if (isFile) {
    try {
      const stat = statSync(absolutePath);
      entry.size = stat.size;
      entry.mtime = stat.mtime.toISOString();
      entry.extension = extname(name).toLowerCase();

      // Get frontmatter title for markdown files
      if (entry.extension === '.md') {
        entry.frontmatterTitle = getFrontmatterTitle(absolutePath);
      }
    } catch {
      // Ignore stat errors
    }
  } else {
    try {
      const stat = statSync(absolutePath);
      entry.mtime = stat.mtime.toISOString();
    } catch {
      // Ignore stat errors
    }
  }

  return entry;
}

/**
 * Simple fuzzy matching for file search
 */
function fuzzyMatch(query: string, text: string): { score: number; matches: Array<{ start: number; end: number }> } | null {
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();

  // Exact match gets highest score
  if (lowerText === lowerQuery) {
    return { score: 100, matches: [{ start: 0, end: text.length }] };
  }

  // Contains match
  const index = lowerText.indexOf(lowerQuery);
  if (index !== -1) {
    return { score: 80 - index, matches: [{ start: index, end: index + query.length }] };
  }

  // Fuzzy character matching
  let queryIdx = 0;
  let score = 0;
  const matches: Array<{ start: number; end: number }> = [];
  let matchStart = -1;

  for (let i = 0; i < lowerText.length && queryIdx < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIdx]) {
      if (matchStart === -1) matchStart = i;
      queryIdx++;
      score += 1;
      // Bonus for consecutive matches
      if (i > 0 && lowerText[i - 1] === lowerQuery[queryIdx - 2]) {
        score += 2;
      }
    } else if (matchStart !== -1) {
      matches.push({ start: matchStart, end: i });
      matchStart = -1;
    }
  }

  // Close any open match
  if (matchStart !== -1) {
    matches.push({ start: matchStart, end: matchStart + 1 });
  }

  // Only return if all query characters were matched
  if (queryIdx !== lowerQuery.length) {
    return null;
  }

  return { score, matches };
}

/**
 * Recursively search for files matching a query
 */
function searchFiles(
  dirPath: string,
  query: string,
  extensions: string[] | undefined,
  includeHidden: boolean,
  results: FileSearchResult[],
  limit: number,
): void {
  if (results.length >= limit) return;

  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (results.length >= limit) return;
      if (shouldExclude(entry.name, includeHidden)) continue;

      const absolutePath = join(dirPath, entry.name);
      const relativePath = getRelativeKBPath(absolutePath);

      if (entry.isDirectory()) {
        // Recurse into directories
        searchFiles(absolutePath, query, extensions, includeHidden, results, limit);
      } else if (entry.isFile()) {
        // Check extension filter
        const ext = extname(entry.name).toLowerCase();
        if (extensions && !extensions.includes(ext)) continue;

        // Check if name matches query
        const match = fuzzyMatch(query, entry.name);
        if (match) {
          const fileEntry = toFileEntry(entry, dirname(relativePath));
          results.push({
            entry: fileEntry,
            score: match.score,
            matches: match.matches,
          });
        }
      }
    }
  } catch {
    // Ignore directories we can't read
  }
}

/**
 * Build a tree structure recursively
 */
function buildTree(
  absolutePath: string,
  relativePath: string,
  depth: number,
  includeHidden: boolean,
): TreeNode[] {
  if (depth <= 0) return [];

  try {
    const entries = readdirSync(absolutePath, { withFileTypes: true });

    // Filter and sort
    const filtered = entries.filter(e => !shouldExclude(e.name, includeHidden));
    const sorted = filtered.sort((a, b) => {
      // Folders first, then alphabetical
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    return sorted.map(entry => {
      const fileEntry = toFileEntry(entry, relativePath);
      const node: TreeNode = { ...fileEntry };

      if (entry.isDirectory() && depth > 1) {
        const childAbsPath = join(absolutePath, entry.name);
        const childRelPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
        node.children = buildTree(childAbsPath, childRelPath, depth - 1, includeHidden);
      }

      return node;
    });
  } catch {
    return [];
  }
}

// =============================================================================
// ROUTER
// =============================================================================

export const filesRouter = router({
  /**
   * List files and folders in a directory
   */
  list: publicProcedure
    .input(FileListInputSchema)
    .query(({ input }) => {
      const { path: dirPath, includeHidden } = input;
      const absolutePath = validatePath(dirPath);

      if (!existsSync(absolutePath)) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Directory not found: ${dirPath}`,
        });
      }

      const stat = statSync(absolutePath);
      if (!stat.isDirectory()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Path is not a directory',
        });
      }

      const entries = readdirSync(absolutePath, { withFileTypes: true });

      // Filter and convert
      const filtered = entries.filter(e => !shouldExclude(e.name, includeHidden));
      const fileEntries = filtered.map(e => toFileEntry(e, dirPath));

      // Sort: folders first, then alphabetical
      fileEntries.sort((a, b) => {
        if (a.type === 'folder' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
      });

      return {
        path: dirPath,
        entries: fileEntries,
        total: fileEntries.length,
      };
    }),

  /**
   * Get file content and metadata
   */
  get: publicProcedure
    .input(FileGetInputSchema)
    .query(({ input }) => {
      const { path: filePath } = input;
      const absolutePath = validatePath(filePath);

      if (!existsSync(absolutePath)) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `File not found: ${filePath}`,
        });
      }

      const stat = statSync(absolutePath);
      if (stat.isDirectory()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Path is a directory, not a file',
        });
      }

      const extension = extname(filePath).toLowerCase();
      const isMarkdown = extension === '.md';
      const rawContent = readFileSync(absolutePath, 'utf-8');

      let content = rawContent;
      let frontmatter: Record<string, unknown> | undefined;

      if (isMarkdown) {
        const parsed = matter(rawContent);
        content = parsed.content;
        frontmatter = parsed.data as Record<string, unknown>;
      }

      const result: FileContent = {
        path: filePath,
        content,
        frontmatter,
        metadata: {
          size: stat.size,
          mtime: stat.mtime.toISOString(),
          extension,
          isMarkdown,
        },
      };

      return result;
    }),

  /**
   * Get a tree structure of files and folders
   */
  tree: publicProcedure
    .input(FileTreeInputSchema)
    .query(({ input }) => {
      const { path: rootPath, depth, includeHidden } = input;
      const absolutePath = validatePath(rootPath);

      if (!existsSync(absolutePath)) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Directory not found: ${rootPath}`,
        });
      }

      const stat = statSync(absolutePath);
      if (!stat.isDirectory()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Path is not a directory',
        });
      }

      const nodes = buildTree(absolutePath, rootPath, depth, includeHidden);

      return {
        path: rootPath,
        nodes,
      };
    }),

  /**
   * Search for files matching a query
   */
  search: publicProcedure
    .input(FileSearchInputSchema)
    .query(({ input }) => {
      const { query, path: searchPath, extensions, limit } = input;
      const absolutePath = validatePath(searchPath);

      if (!existsSync(absolutePath)) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Directory not found: ${searchPath}`,
        });
      }

      const results: FileSearchResult[] = [];
      searchFiles(absolutePath, query, extensions, false, results, limit);

      // Sort by score descending
      results.sort((a, b) => b.score - a.score);

      return {
        query,
        results: results.slice(0, limit),
        total: results.length,
      };
    }),
});

export type FilesRouter = typeof filesRouter;
