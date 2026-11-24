const memoryCache = new Map<string, { data: any; timestamp: number }>();

export function getCached<T>(key: string): T | undefined {
  const entry = memoryCache.get(key);
  return entry ? (entry.data as T) : undefined;
}

export function setCached<T>(key: string, data: T): void {
  memoryCache.set(key, { data, timestamp: Date.now() });
}

export function isCacheFresh(key: string, maxAgeMs = 30_000): boolean {
  const entry = memoryCache.get(key);
  if (!entry) return false;
  return Date.now() - entry.timestamp < maxAgeMs;
}

export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
}
