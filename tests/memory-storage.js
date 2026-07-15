/** In-memory localStorage for Node tests (store.js persists via localStorage). */
export function installMemoryLocalStorage() {
  const map = new Map();
  const storage = {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(String(key), String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
    clear() {
      map.clear();
    },
    key(i) {
      return [...map.keys()][i] ?? null;
    },
    get length() {
      return map.size;
    },
  };
  globalThis.localStorage = storage;
  return storage;
}
