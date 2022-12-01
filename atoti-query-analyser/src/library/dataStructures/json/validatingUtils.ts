export function validateInt(rawInt: any): number {
  const int = parseInt(rawInt, 10);
  if (!Number.isInteger(int)) {
    throw new Error("bad integer");
  }
  return int;
}

export function validateBoolean(rawBoolean: any): boolean {
  if (typeof rawBoolean !== "boolean") {
    if (typeof rawBoolean === "string") {
      if (rawBoolean === "true") {
        return true;
      } else if (rawBoolean === "false") {
        return false;
      } else {
        throw new Error(`Cannot cast string ${JSON.stringify(rawBoolean)} to boolean`);
      }
    }
    throw new Error(`Expected boolean, got ${typeof rawBoolean}`);
  }
  return rawBoolean;
}

export function validateString(rawString: any): string {
  if (typeof rawString !== "string") {
    throw new Error(`Expected string, got ${typeof rawString}`);
  }
  return rawString;
}

export function validateObject(rawObject: any): object {
  if (typeof rawObject !== "object") {
    throw new Error(`Expected object, got ${typeof rawObject}`);
  }
  if (rawObject === null) {
    throw new Error("Expected object, got null");
  }
  return rawObject;
}

export function validateObjectAsMap<K, V>(rawObject: any, keyValidator: (key: any) => K, valueValidator: (value: any) => V): Map<K, V> {
  validateObject(rawObject);
  return new Map(
    Object
      .entries(rawObject)
      .map(([key, value]) => ([keyValidator(key), valueValidator(value)])));
}

export function validateList<T>(rawList: any, validateItem: (item: any) => T): T[] {
  if (!Array.isArray(rawList)) {
    throw new Error("rawList must be a list");
  }

  return rawList.map(validateItem);
}

export function validateListAsSet<T>(rawList: any, validateItem: (item: any) => T): Set<T> {
  return new Set(validateList(rawList, validateItem));
}

export function optional<T>(rawValue: any, validator: (value: any) => T): T | undefined {
  try {
    return validator(rawValue);
  } catch (_) {
    return undefined;
  }
}

export function multiFieldValidate<T>(validator: (value: any) => T, ...rawValues: any[]): T {
  const errors = [];
  for (const rawValue of rawValues) {
    try {
      return validator(rawValue);
    } catch (err) {
        errors.push(err);
    }
  }
  errors.forEach((err) => console.log(err));
  throw new Error("None of suggested fields passed validation", { cause: errors });
}