import uuid from "uuid";

export type UUID = string & { _uuidBrand: undefined };

/**
 * Generate a UUID.
 */
export function generateUUID(): UUID {
  return uuid.v4() as UUID;
}
