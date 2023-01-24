import { validateInt, validateObject, validateString } from "./validatingUtils";

export interface Filter {
  id: number;
  description: string;
}

// Reason: `validate...()` function
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Deep validation of JSON parse result, expected to be {@link Filter}.
 */
export function validateFilter(rawFilter: any): Filter {
  validateObject(rawFilter);
  return {
    description: validateString(rawFilter.description),
    id: validateInt(rawFilter.id),
  };
}
