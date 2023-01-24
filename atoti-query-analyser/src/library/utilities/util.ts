/**
 * Check if input is `null` or `undefined`, throw an error if it is.
 */
export function requireNonNull<T>(value: T | null | undefined): T {
  if (value === undefined || value === null) {
    throw new Error("Unexpected null or undefined");
  }
  return value;
}

/**
 * If the map contains the key, return the corresponding value. Otherwise,
 * compute the new value using the given supplier, store it in the map and
 * return it.
 */
export function computeIfAbsent<K, V>(
  map: Map<K, V>,
  key: K,
  valueSupplier: (key: K) => V
): V {
  if (map.has(key)) {
    return requireNonNull(map.get(key));
  }
  const value = valueSupplier(key);
  map.set(key, value);
  return value;
}

/**
 * Wrap the thrown object in `Error` class if it is not an instance of `Error`.
 */
export function asError(caught: unknown): Error {
  if (caught instanceof Error) {
    return caught;
  }
  return new Error(`${caught}`);
}
