import type { StorageSchema } from "./types";

/**
 * Typed wrapper around chrome.storage.local.
 */
export async function getStorage<K extends keyof StorageSchema>(
  key: K
): Promise<StorageSchema[K] | undefined> {
  const result = await chrome.storage.local.get(key);
  return result[key] as StorageSchema[K] | undefined;
}

/**
 * Set a value in chrome.storage.local.
 */
export async function setStorage<K extends keyof StorageSchema>(
  key: K,
  value: StorageSchema[K]
): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

/**
 * Get multiple values from storage at once.
 */
export async function getStorageMulti<K extends keyof StorageSchema>(
  keys: K[]
): Promise<Partial<Pick<StorageSchema, K>>> {
  const result = await chrome.storage.local.get(keys);
  return result as Partial<Pick<StorageSchema, K>>;
}

/**
 * Listen for storage changes on a specific key.
 */
export function onStorageChange<K extends keyof StorageSchema>(
  key: K,
  callback: (newValue: StorageSchema[K] | undefined) => void
): () => void {
  const listener = (
    changes: { [k: string]: chrome.storage.StorageChange },
    areaName: string
  ) => {
    if (areaName === "local" && key in changes) {
      callback(changes[key].newValue as StorageSchema[K] | undefined);
    }
  };

  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
