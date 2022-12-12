// Reason: `validate...()` function
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Checks if input is convertible to a 32-bit integer.
 */
export function validateInt(rawInt: any): number {
  const int = parseInt(rawInt, 10);
  if (!Number.isInteger(int)) {
    throw new Error("bad integer");
  }
  return int;
}

/**
 * Check if input is boolean or `"true"`/`"false"` string.
 */
export function validateBoolean(rawBoolean: any): boolean {
  if (typeof rawBoolean !== "boolean") {
    if (typeof rawBoolean === "string") {
      if (rawBoolean === "true") {
        return true;
      } else if (rawBoolean === "false") {
        return false;
      } else {
        throw new Error(
          `Cannot cast string ${JSON.stringify(rawBoolean)} to boolean`
        );
      }
    }
    throw new Error(`Expected boolean, got ${typeof rawBoolean}`);
  }
  return rawBoolean;
}

/**
 * Check if input is a string.
 */
export function validateString(rawString: any): string {
  if (typeof rawString !== "string") {
    throw new Error(`Expected string, got ${typeof rawString}`);
  }
  return rawString;
}

/**
 * Check if input is a non-null object.
 */
export function validateObject(rawObject: any): object {
  if (typeof rawObject !== "object") {
    throw new Error(`Expected object, got ${typeof rawObject}`);
  }
  if (rawObject === null) {
    throw new Error("Expected object, got null");
  }
  return rawObject;
}

/**
 * Check if input is a non-null object. If yes, convert it into a Map.
 */
export function validateObjectAsMap<K, V>(
  rawObject: any,
  keyValidator: (key: any) => K,
  valueValidator: (value: any) => V
): Map<K, V> {
  validateObject(rawObject);
  return new Map(
    Object.entries(rawObject).map(([key, value]) => [
      keyValidator(key),
      valueValidator(value),
    ])
  );
}

/**
 * Check if input is an array.
 */
export function validateList<T>(
  rawList: any,
  validateItem: (item: any) => T
): T[] {
  if (!Array.isArray(rawList)) {
    throw new Error("rawList must be a list");
  }

  return rawList.map(validateItem);
}

/**
 * Check if input is a list. If yes, convert it into a Set.
 */
export function validateListAsSet<T>(
  rawList: any,
  validateItem: (item: any) => T
): Set<T> {
  return new Set(validateList(rawList, validateItem));
}

/**
 * Check if input is either a valid instance of type `T` or `undefined`. Useful
 * for optional fields.
 */
export function optional<T>(
  rawValue: any,
  validator: (value: any) => T
): T | undefined {
  try {
    return validator(rawValue);
  } catch (_) {
    return undefined;
  }
}

/**
 * Check if any of provided inputs is a valid instance of type `T`. If yes,
 * return first of them.
 */
export function multiFieldValidate<T>(
  validator: (value: any) => T,
  ...rawValues: any[]
): T {
  const errors = [];
  for (const rawValue of rawValues) {
    try {
      return validator(rawValue);
    } catch (err) {
      errors.push(err);
    }
  }
  errors.forEach((err) => console.log(err));
  throw new Error("None of suggested fields passed validation", {
    cause: errors,
  });
}
