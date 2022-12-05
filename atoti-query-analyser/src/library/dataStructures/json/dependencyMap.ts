import {
  validateInt,
  validateListAsSet,
  validateObjectAsMap,
} from "./validatingUtils";

export interface DependencyMap extends Map<number, Set<number>> {}

export function validateDependencyMap(rawDependencies: any): DependencyMap {
  return validateObjectAsMap(rawDependencies, validateInt, (value) =>
    validateListAsSet(value, validateInt)
  );
}
