import uuid from "uuid";

export type UUID = string & { _uuidBrand: undefined };

export function generateUUID(): UUID {
  return uuid.v4() as UUID;
}
