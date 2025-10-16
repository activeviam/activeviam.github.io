import {
  validateList,
  validateObject,
  validatePath,
  validateString,
} from "./validatingUtils";

export interface CubeLocation {
  dimension: string;
  hierarchy: string;
  level: string[];
  path: (unknown | unknown[])[];
}

// Reason: `validate...()` function
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Deep validation of JSON parse result, expected to be {@link CubeLocation}.
 */
export function validateLocation(rawLocation: any): CubeLocation {
  validateObject(rawLocation);

  return {
    dimension: validateString(rawLocation.dimension),
    hierarchy: validateString(rawLocation.hierarchy),
    level: validateList(rawLocation.level, validateString),
    path: validateList(rawLocation.path, validatePath),
  };
}
