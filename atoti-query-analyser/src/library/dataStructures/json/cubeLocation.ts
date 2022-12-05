import {
  validateList,
  validateObject,
  validateString,
} from "./validatingUtils";

export interface CubeLocation {
  dimension: string;
  hierarchy: string;
  level: string[];
  path: string[];
}

export function validateLocation(rawLocation: any): CubeLocation {
  validateObject(rawLocation);

  return {
    dimension: validateString(rawLocation.dimension),
    hierarchy: validateString(rawLocation.hierarchy),
    level: validateList(rawLocation.level, validateString),
    path: validateList(rawLocation.path, validateString),
  };
}
