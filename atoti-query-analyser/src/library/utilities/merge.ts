export function mergeSets<T>(sets: Set<T>[]): Set<T> {
  return sets.reduce(
    (acc, set) =>
      Array.from(set).reduce(
        (store: Set<T>, element) => store.add(element),
        acc
      ),
    new Set<T>()
  );
}

export function mergeMaps<K, V>(
  maps: Map<K, V>[],
  reducer: (oldValue: V, newValue: V) => V
): Map<K, V> {
  return maps.reduce(
    (acc, map) =>
      Array.from(map).reduce((store, [key, value]) => {
        if (store.has(key)) {
          store.set(key, reducer(store.get(key) as V, value));
        } else {
          store.set(key, value);
        }
        return store;
      }, acc),
    new Map<K, V>()
  );
}
