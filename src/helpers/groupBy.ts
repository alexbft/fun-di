export function groupBy<T, K>(
  items: T[],
  keyFn: (item: T) => K,
): Map<K, Set<T>> {
  const result: Map<K, Set<T>> = new Map();
  for (const item of items) {
    const key = keyFn(item);
    const value = result.get(key);
    if (value) {
      value.add(item);
    } else {
      result.set(key, new Set([item]));
    }
  }
  return result;
}
