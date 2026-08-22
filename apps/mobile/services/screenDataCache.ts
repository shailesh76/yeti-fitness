/** Small session cache for screen-owned view models.
 *
 * This intentionally is not a second database. WatermelonDB/AsyncStorage remain
 * the durable offline sources; this cache only prevents tab remounts from
 * throwing away already-rendered values during the current app session.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const PERSISTED_PREFIX = '@yeti_screen_data:';
const values = new Map<string, unknown>();
const fetchedAt = new Map<string, number>();
const inFlight = new Map<string, Promise<unknown>>();
const listeners = new Map<string, Set<(value: unknown | undefined) => void>>();

function perfNow(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function devLog(message: string): void {
  if ((globalThis as any).__DEV__) console.log(message);
}

function emit(key: string, value: unknown | undefined): void {
  listeners.get(key)?.forEach((listener) => listener(value));
}

function getStorage() {
  const globalStorage = (globalThis as any).AsyncStorage;
  if (globalStorage?.setItem) return globalStorage;
  return (AsyncStorage as any)?.setItem
    ? AsyncStorage
    : (AsyncStorage as any)?.default || AsyncStorage;
}

export function getScreenData<T>(key: string): T | undefined {
  return values.get(key) as T | undefined;
}

export function setScreenData<T>(key: string, value: T): T {
  values.set(key, value);
  fetchedAt.set(key, Date.now());
  emit(key, value);
  return value;
}

export async function persistScreenData<T>(key: string, value: T): Promise<T> {
  setScreenData(key, value);
  try {
    await getStorage().setItem(`${PERSISTED_PREFIX}${key}`, JSON.stringify(value));
  } catch {
    // Session publication must still succeed when a native model is not serializable.
  }
  return value;
}

export async function hydrateScreenData<T>(key: string): Promise<T | undefined> {
  const memory = getScreenData<T>(key);
  if (memory !== undefined) return memory;
  const started = perfNow();
  try {
    const raw = await getStorage().getItem(`${PERSISTED_PREFIX}${key}`);
    if (!raw) return undefined;
    const value = JSON.parse(raw) as T;
    values.set(key, value);
    emit(key, value);
    devLog(`[YETI PERF] ${key} persistent cache hit ${Math.round(perfNow() - started)}ms`);
    return value;
  } catch {
    return undefined;
  }
}

export function isScreenDataStale(key: string, staleMs = 60_000): boolean {
  return !fetchedAt.has(key) || Date.now() - (fetchedAt.get(key) || 0) >= staleMs;
}

/** Deduplicate identical background refreshes triggered by mount + focus. */
export function dedupeScreenRefresh<T>(key: string, refresh: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const request = refresh().finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
}

export function invalidateScreenData(key: string): void {
  fetchedAt.delete(key);
  devLog(`[YETI CACHE] invalidated ${key}`);
}

export function invalidateScreenDataPrefix(prefix: string): void {
  const keys = new Set([...values.keys(), ...fetchedAt.keys()]);
  keys.forEach((key) => {
    if (key.startsWith(prefix)) invalidateScreenData(key);
  });
}

export function subscribeScreenData<T>(key: string, listener: (value: T | undefined) => void): () => void {
  const keyListeners = listeners.get(key) || new Set();
  keyListeners.add(listener as (value: unknown | undefined) => void);
  listeners.set(key, keyListeners);
  return () => {
    keyListeners.delete(listener as (value: unknown | undefined) => void);
    if (keyListeners.size === 0) listeners.delete(key);
  };
}

export async function clearScreenDataForUser(userId: string): Promise<void> {
  const suffix = `:${userId}`;
  const keys = new Set([...values.keys(), ...fetchedAt.keys(), ...inFlight.keys()]);
  keys.forEach((key) => {
    if (key.endsWith(suffix) || key.includes(`${suffix}:`)) {
      values.delete(key);
      fetchedAt.delete(key);
      inFlight.delete(key);
      emit(key, undefined);
    }
  });
  try {
    const persisted = await getStorage().getAllKeys();
    const owned = persisted.filter((key: string) => key.startsWith(PERSISTED_PREFIX) &&
      (key.endsWith(suffix) || key.includes(`${suffix}:`)));
    if (owned.length) await getStorage().multiRemove(owned);
  } catch {
    // In-memory isolation is already complete; persistent cleanup retries on logout.
  }
}

export function clearScreenDataForTests(): void {
  values.clear();
  fetchedAt.clear();
  inFlight.clear();
  listeners.clear();
}
