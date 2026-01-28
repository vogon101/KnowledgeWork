/**
 * Shared path utilities for the server
 *
 * All services should use getKnowledgeBasePath() instead of hardcoding paths.
 * The KNOWLEDGE_BASE_PATH environment variable must be set (see .env file).
 */
import path from 'path';
let cachedKBPath = null;
/**
 * Get the knowledge base root path.
 * All relative file paths in the system are relative to this directory.
 */
export function getKnowledgeBasePath() {
    if (cachedKBPath)
        return cachedKBPath;
    const kbPath = process.env.KNOWLEDGE_BASE_PATH;
    if (!kbPath) {
        throw new Error('KNOWLEDGE_BASE_PATH environment variable is required. ' +
            'Set it in the root .env file to point to your content directory.');
    }
    cachedKBPath = kbPath;
    return kbPath;
}
/**
 * Resolve a relative path to an absolute path within the knowledge base.
 */
export function resolveKBPath(relativePath) {
    return path.join(getKnowledgeBasePath(), relativePath);
}
/**
 * Get a path relative to the knowledge base root.
 */
export function getRelativeKBPath(absolutePath) {
    return path.relative(getKnowledgeBasePath(), absolutePath);
}
/**
 * Check if a path is within the knowledge base.
 */
export function isWithinKB(absolutePath) {
    const kbPath = getKnowledgeBasePath();
    const resolved = path.resolve(absolutePath);
    return resolved.startsWith(kbPath);
}
