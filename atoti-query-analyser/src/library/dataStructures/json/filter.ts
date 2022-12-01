import { validateInt, validateObject, validateString } from "./validatingUtils";

export interface Filter {
  id: number,
  description: string,
}

export function validateFilter(rawFilter: any): Filter {
  validateObject(rawFilter);
  return {
    description: validateString(rawFilter.description),
    id: validateInt(rawFilter.id)
  };
}