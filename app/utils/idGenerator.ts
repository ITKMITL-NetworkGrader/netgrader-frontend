/**
 * Utility functions for converting titles to IDs
 * Converts titles to lowercase with spaces replaced by hyphens
 */

/**
 * Converts a title/name to a valid ID format
 * - Converts to lowercase
 * - Replaces spaces with hyphens
 * - Removes special characters except hyphens and underscores
 * - Trims leading/trailing hyphens
 *
 * @param title - The title to convert
 * @returns The converted ID string
 */
export function titleToId(title: string): string {
  if (!title || typeof title !== 'string') {
    return '';
  }

  return title
    .toLowerCase() // Convert to lowercase
    .trim() // Remove leading/trailing whitespace
    .replace(/[^a-z0-9\s_-]/g, '') // Remove special characters except spaces, underscores, and hyphens
    .replace(/\s+/g, '-') // Replace one or more spaces with single hyphen
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single underscore
    .replace(/-{2,}/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^[-_]+|[-_]+$/g, ''); // Remove leading/trailing hyphens and underscores
}

/**
 * Converts a part title to a part ID
 * @param title - The part title
 * @returns The converted part ID
 */
export function partTitleToId(title: string): string {
  return titleToId(title);
}

/**
 * Converts a task name to a task ID
 * @param name - The task name
 * @returns The converted task ID
 */
export function taskNameToId(name: string): string {
  return titleToId(name);
}

/**
 * Ensures the ID is unique within an array of existing IDs
 * If the ID already exists, appends a number to make it unique
 *
 * @param baseId - The base ID to make unique
 * @param existingIds - Array of existing IDs to check against
 * @returns A unique ID
 */
export function ensureUniqueId(baseId: string, existingIds: string[]): string {
  if (!baseId) {
    return '';
  }

  let uniqueId = baseId;
  let counter = 1;

  while (existingIds.includes(uniqueId)) {
    uniqueId = `${baseId}-${counter}`;
    counter++;
  }

  return uniqueId;
}

/**
 * Converts a title to a unique ID within the context of existing IDs
 * @param title - The title to convert
 * @param existingIds - Array of existing IDs to ensure uniqueness
 * @returns A unique ID based on the title
 */
export function titleToUniqueId(title: string, existingIds: string[]): string {
  const baseId = titleToId(title);
  return ensureUniqueId(baseId, existingIds);
}