/**
 * File System Schemas
 *
 * Types for browsing and managing files in the knowledge base.
 */

import { z } from 'zod';

// =============================================================================
// ENUMS
// =============================================================================

export const FileTypeSchema = z.enum(['file', 'folder']);
export type FileType = z.infer<typeof FileTypeSchema>;

// =============================================================================
// FILE ENTRY (single file or folder)
// =============================================================================

export const FileEntrySchema = z.object({
  /** File or folder name */
  name: z.string(),
  /** Path relative to knowledge base root */
  path: z.string(),
  /** Whether this is a file or folder */
  type: FileTypeSchema,
  /** File size in bytes (files only) */
  size: z.number().optional(),
  /** Last modified time as ISO string */
  mtime: z.string().optional(),
  /** Title from frontmatter (markdown files only) */
  frontmatterTitle: z.string().nullable().optional(),
  /** File extension (files only) */
  extension: z.string().optional(),
});

export type FileEntry = z.infer<typeof FileEntrySchema>;

// =============================================================================
// TREE NODE (for hierarchical tree view)
// =============================================================================

export const TreeNodeSchema: z.ZodType<TreeNode> = z.lazy(() =>
  FileEntrySchema.extend({
    /** Child nodes (folders only, when expanded) */
    children: z.array(TreeNodeSchema).optional(),
    /** Whether this node is expanded in the UI */
    expanded: z.boolean().optional(),
  })
);

export interface TreeNode extends FileEntry {
  children?: TreeNode[];
  expanded?: boolean;
}

// =============================================================================
// SEARCH RESULT
// =============================================================================

export const FileSearchResultSchema = z.object({
  /** The matching file entry */
  entry: FileEntrySchema,
  /** Relevance score (higher is better) */
  score: z.number(),
  /** Matched portions of the name (for highlighting) */
  matches: z.array(z.object({
    start: z.number(),
    end: z.number(),
  })).optional(),
});

export type FileSearchResult = z.infer<typeof FileSearchResultSchema>;

// =============================================================================
// FILE CONTENT (for viewing files)
// =============================================================================

export const FileContentSchema = z.object({
  /** Path relative to knowledge base root */
  path: z.string(),
  /** Raw file content */
  content: z.string(),
  /** Parsed frontmatter (markdown files only) */
  frontmatter: z.record(z.unknown()).optional(),
  /** File metadata */
  metadata: z.object({
    size: z.number(),
    mtime: z.string(),
    extension: z.string(),
    isMarkdown: z.boolean(),
  }),
});

export type FileContent = z.infer<typeof FileContentSchema>;

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

export const FileListInputSchema = z.object({
  /** Directory path (relative to KB root, defaults to root) */
  path: z.string().optional().default(''),
  /** Include hidden files (starting with .) */
  includeHidden: z.boolean().optional().default(false),
});

export type FileListInput = z.infer<typeof FileListInputSchema>;

export const FileTreeInputSchema = z.object({
  /** Root path for the tree (relative to KB root, defaults to root) */
  path: z.string().optional().default(''),
  /** Maximum depth to traverse (1 = immediate children only) */
  depth: z.number().optional().default(1),
  /** Include hidden files (starting with .) */
  includeHidden: z.boolean().optional().default(false),
});

export type FileTreeInput = z.infer<typeof FileTreeInputSchema>;

export const FileSearchInputSchema = z.object({
  /** Search query (fuzzy matches against file names) */
  query: z.string().min(1),
  /** Directory to search within (relative to KB root, defaults to root) */
  path: z.string().optional().default(''),
  /** File extensions to include (e.g., ['.md', '.txt']) */
  extensions: z.array(z.string()).optional(),
  /** Maximum number of results */
  limit: z.number().optional().default(20),
});

export type FileSearchInput = z.infer<typeof FileSearchInputSchema>;

export const FileGetInputSchema = z.object({
  /** File path (relative to KB root) */
  path: z.string().min(1),
});

export type FileGetInput = z.infer<typeof FileGetInputSchema>;
