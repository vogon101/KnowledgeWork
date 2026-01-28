/**
 * ID Parsing Utilities for tRPC
 *
 * Centralized handling of item IDs that can be either:
 * - Numeric: 123
 * - Display format: "T-123"
 * - String numeric: "123"
 */
import { z } from 'zod';
/**
 * Resolve an item ID from various input formats to a numeric ID.
 *
 * Accepts:
 * - number: 123 -> 123
 * - string "T-123" -> 123
 * - string "123" -> 123
 */
export declare function resolveItemId(input: string | number): number;
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
export declare const itemIdSchema: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber]>, number, string | number>;
/**
 * Zod schema for optional item ID.
 */
export declare const optionalItemIdSchema: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>, number | undefined, string | number | undefined>;
/**
 * Create a schema for an object with an 'id' field that auto-resolves.
 *
 * Usage:
 * ```ts
 * .input(itemIdInput)
 * // input.id is guaranteed to be a number
 * ```
 */
export declare const itemIdInput: z.ZodObject<{
    id: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber]>, number, string | number>;
}, "strip", z.ZodTypeAny, {
    id: number;
}, {
    id: string | number;
}>;
/**
 * Create a schema for an object with an 'itemId' field that auto-resolves.
 */
export declare const itemIdFieldInput: z.ZodObject<{
    itemId: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber]>, number, string | number>;
}, "strip", z.ZodTypeAny, {
    itemId: number;
}, {
    itemId: string | number;
}>;
