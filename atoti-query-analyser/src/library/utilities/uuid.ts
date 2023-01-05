import { v4 } from "uuid";

export type UUID = string & { _uuidBrand: undefined };

/**
 * Generate a UUID.
 */
export function generateUUID(): UUID {
  return v4() as UUID;
}
