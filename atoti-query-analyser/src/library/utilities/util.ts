// TODO replace with `as T`
export function requireNonNull<T>(value: T | null | undefined): T {
  if (value === undefined || value === null) {
    throw new Error("Unexpected null or undefined");
  }
  return value;
}

export function computeIfAbsent<K, V>(map: Map<K, V>, key: K, valueSupplier: (key: K) => V): V {
  if (map.has(key)) {
    return requireNonNull(map.get(key));
  }
  const value = valueSupplier(key);
  map.set(key, value);
  return value;
}

