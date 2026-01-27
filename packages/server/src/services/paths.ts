/**
 * Shared path utilities for the server
 *
 * All services should use getKnowledgeBasePath() instead of hardcoding paths.
 * The KNOWLEDGE_BASE_PATH environment variable must be set (see .env file).
 */

import path from 'path';

let cachedKBPath: string | null = null;

/**
 * Get the knowledge base root path.
 * All relative file paths in the system are relative to this directory.
 */
export function getKnowledgeBasePath(): string {
  if (cachedKBPath) return cachedKBPath;

  const kbPath = process.env.KNOWLEDGE_BASE_PATH;
  if (!kbPath) {
    throw new Error(
      'KNOWLEDGE_BASE_PATH environment variable is required. ' +
      'Set it in the root .env file to point to your content directory.'
    );
  }

  cachedKBPath = kbPath;
  return kbPath;
}

/**
 * Resolve a relative path to an absolute path within the knowledge base.
 */
export function resolveKBPath(relativePath: string): string {
  return path.join(getKnowledgeBasePath(), relativePath);
}

/**
 * Get a path relative to the knowledge base root.
 */
export function getRelativeKBPath(absolutePath: string): string {
  return path.relative(getKnowledgeBasePath(), absolutePath);
}

/**
 * Check if a path is within the knowledge base.
 */
export function isWithinKB(absolutePath: string): boolean {
  const kbPath = getKnowledgeBasePath();
  const resolved = path.resolve(absolutePath);
  return resolved.startsWith(kbPath);
}
