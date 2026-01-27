/**
 * URL utilities for consistent link generation across the app
 */

interface MeetingUrlOptions {
  // Option 1: Full path from database/file
  path?: string;

  // Option 2: Components
  org?: string;
  date?: string;  // YYYY-MM-DD format
  slug?: string;
}

/**
 * Generate a meeting URL from various input formats.
 *
 * Handles:
 * - Full path: "acme-corp/meetings/2026/01/2026-01-11-alex-radford.md"
 * - Components: { org: "acme-corp", date: "2026-01-11", slug: "alex-radford" }
 *
 * Output: "/meetings/acme-corp/2026/01/alex-radford"
 */
export function getMeetingUrl(options: MeetingUrlOptions): string {
  // If we have individual components, build directly
  if (options.org && options.date && options.slug) {
    const [year, month] = options.date.split("-");
    return `/meetings/${options.org}/${year}/${month}/${options.slug}`;
  }

  // If we have a path, parse it
  if (options.path) {
    return parseMeetingPath(options.path);
  }

  // Fallback - shouldn't happen
  console.warn("getMeetingUrl: insufficient options provided", options);
  return "/meetings";
}

/**
 * Parse a meeting file path into a URL.
 *
 * Input formats:
 * - "acme-corp/meetings/2026/01/2026-01-11-slug.md"
 * - "acme-corp/meetings/2026/01/slug.md"
 *
 * Output: "/meetings/acme-corp/2026/01/slug"
 */
export function parseMeetingPath(path: string): string {
  // Remove .md extension
  let cleanPath = path.replace(/\.md$/, "");

  // Extract parts: org/meetings/YYYY/MM/filename
  const match = cleanPath.match(/^([^/]+)\/meetings\/(\d{4})\/(\d{2})\/(.+)$/);

  if (match) {
    const [, org, year, month, filename] = match;
    // Strip date prefix (YYYY-MM-DD-) from filename if present
    const slug = filename.replace(/^\d{4}-\d{2}-\d{2}-/, "");
    return `/meetings/${org}/${year}/${month}/${slug}`;
  }

  // Fallback: just prepend /meetings/ and clean up
  return `/meetings/${cleanPath.replace(/\/meetings\//, "/")}`;
}

/**
 * Generate a project URL
 */
export function getProjectUrl(org: string, slug: string): string {
  return `/projects/${org}/${slug}`;
}

/**
 * Generate a person URL
 */
export function getPersonUrl(personId: number): string {
  return `/people/${personId}`;
}

/**
 * Generate a task URL (for future task detail pages)
 */
export function getTaskUrl(taskId: number): string {
  return `/tasks/${taskId}`;
}
