/**
 * ID Parsing Utilities for tRPC
 *
 * Centralized handling of item IDs that can be either:
 * - Numeric: 123
 * - Display format: "T-123"
 * - String numeric: "123"
 */
import { z } from 'zod';
import { parseTaskId } from '@kw/api-types';
/**
 * Resolve an item ID from various input formats to a numeric ID.
 *
 * Accepts:
 * - number: 123 -> 123
 * - string "T-123" -> 123
 * - string "123" -> 123
 */
export function resolveItemId(input) {
    if (typeof input === 'number') {
        return input;
    }
    // Try parsing as T-XXX format first
    const parsed = parseTaskId(input);
    if (parsed !== null) {
        return parsed;
    }
    // Fall back to parseInt
    const num = parseInt(input, 10);
    if (isNaN(num)) {
        throw new Error(`Invalid item ID: ${input}`);
    }
    return num;
}
/**
 * Zod schema for item ID that accepts string or number and transforms to number.
 *
 * Usage in tRPC input:
 * ```ts
 * .input(z.object({
 *   id: itemIdSchema,
 * }))
 * ```
 */
export const itemIdSchema = z.union([z.string(), z.number()]).transform((val) => {
    return resolveItemId(val);
});
/**
 * Zod schema for optional item ID.
 */
export const optionalItemIdSchema = z.union([z.string(), z.number()]).optional().transform((val) => {
    if (val === undefined)
        return undefined;
    return resolveItemId(val);
});
/**
 * Create a schema for an object with an 'id' field that auto-resolves.
 *
 * Usage:
 * ```ts
 * .input(itemIdInput)
 * // input.id is guaranteed to be a number
 * ```
 */
export const itemIdInput = z.object({
    id: itemIdSchema,
});
/**
 * Create a schema for an object with an 'itemId' field that auto-resolves.
 */
export const itemIdFieldInput = z.object({
    itemId: itemIdSchema,
});
