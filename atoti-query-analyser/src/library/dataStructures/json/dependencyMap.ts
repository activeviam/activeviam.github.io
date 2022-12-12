import {
  validateInt,
  validateListAsSet,
  validateObjectAsMap,
} from "./validatingUtils";

export type DependencyMap = Map<number, Set<number>>;

// Reason: `validate...()` function
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Deep validation of JSON parse result, expected to be {@link DependencyMap}.
 */
export function validateDependencyMap(rawDependencies: any): DependencyMap {
  return validateObjectAsMap(rawDependencies, validateInt, (value) =>
    validateListAsSet(value, validateInt)
  );
}
