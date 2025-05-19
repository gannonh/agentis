/**
 * Utility functions for the Arcade client
 */

/**
 * Formats error messages from the Arcade API
 *
 * @param error - Error object
 * @returns Formatted error message
 */
export const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unknown error occurred';
};

/**
 * Creates a timeout promise that rejects after specified milliseconds
 *
 * @param ms - Timeout in milliseconds
 * @returns Promise that rejects after timeout
 */
export const createTimeout = (ms: number): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
  });
};

/**
 * Checks if a value is a plain object
 *
 * @param value - Value to check
 * @returns True if value is a plain object, false otherwise
 */
export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
};

/**
 * Converts a snake_case string to camelCase
 *
 * @param str - Snake case string
 * @returns Camel case string
 */
export const snakeToCamel = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

/**
 * Transforms object keys from snake_case to camelCase recursively
 *
 * @param obj - Object with snake_case keys
 * @returns Object with camelCase keys
 */
export const transformKeysToCamelCase = <T extends Record<string, unknown>>(
  obj: T
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = snakeToCamel(key);
      const value = obj[key];

      if (isPlainObject(value)) {
        result[camelKey] = transformKeysToCamelCase(value);
      } else if (Array.isArray(value)) {
        result[camelKey] = value.map((item) =>
          isPlainObject(item) ? transformKeysToCamelCase(item) : item
        );
      } else {
        result[camelKey] = value;
      }
    }
  }

  return result;
};
