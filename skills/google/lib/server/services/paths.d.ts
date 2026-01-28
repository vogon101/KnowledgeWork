/**
 * Shared path utilities for the server
 *
 * All services should use getKnowledgeBasePath() instead of hardcoding paths.
 * The KNOWLEDGE_BASE_PATH environment variable must be set (see .env file).
 */
/**
 * Get the knowledge base root path.
 * All relative file paths in the system are relative to this directory.
 */
export declare function getKnowledgeBasePath(): string;
/**
 * Resolve a relative path to an absolute path within the knowledge base.
 */
export declare function resolveKBPath(relativePath: string): string;
/**
 * Get a path relative to the knowledge base root.
 */
export declare function getRelativeKBPath(absolutePath: string): string;
/**
 * Check if a path is within the knowledge base.
 */
export declare function isWithinKB(absolutePath: string): boolean;
