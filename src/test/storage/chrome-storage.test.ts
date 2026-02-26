import { describe, it, expect, vi, beforeEach } from "vitest";

// We need to be able to seed/clear mock storage between tests
let mockStorage: Record<string, unknown> = {};

// Reset mock storage before import so the module picks up clean state
beforeEach(() => {
  mockStorage = {};
  // Reset the mock implementations to use fresh storage
  vi.mocked(chrome.storage.local.get).mockImplementation((keys: string | string[]) => {
    const keyArr = typeof keys === "string" ? [keys] : keys;
    const result: Record<string, unknown> = {};
    for (const k of keyArr) {
      if (k in mockStorage) result[k] = mockStorage[k];
    }
    return Promise.resolve(result);
  });

  vi.mocked(chrome.storage.local.set).mockImplementation((items: Record<string, unknown>) => {
    Object.assign(mockStorage, items);
    return Promise.resolve();
  });

  vi.mocked(chrome.storage.onChanged.addListener).mockClear();
  vi.mocked(chrome.storage.onChanged.removeListener).mockClear();
});

import { getStorage, setStorage, getStorageMulti, onStorageChange } from "@/storage/chrome-storage";

describe("chrome-storage wrapper", () => {
  describe("getStorage", () => {
    it("should return undefined for missing keys", async () => {
      const result = await getStorage("config");
      expect(result).toBeUndefined();
    });

    it("should return stored value", async () => {
      mockStorage.config = { organization: "myorg", pat: "test" };
      const result = await getStorage("config");
      expect(result).toEqual({ organization: "myorg", pat: "test" });
    });
  });

  describe("setStorage", () => {
    it("should store a value", async () => {
      await setStorage("lastUpdated", "2025-02-26T10:00:00Z");
      expect(mockStorage.lastUpdated).toBe("2025-02-26T10:00:00Z");
    });

    it("should overwrite existing value", async () => {
      mockStorage.lastUpdated = "old";
      await setStorage("lastUpdated", "new");
      expect(mockStorage.lastUpdated).toBe("new");
    });

    it("should store null", async () => {
      await setStorage("errorState", null);
      expect(mockStorage.errorState).toBeNull();
    });
  });

  describe("getStorageMulti", () => {
    it("should return multiple values", async () => {
      mockStorage.cachedBuilds = [{ id: 1 }];
      mockStorage.cachedPRs = [{ id: 2 }];
      mockStorage.lastUpdated = "2025-02-26";

      const result = await getStorageMulti(["cachedBuilds", "cachedPRs", "lastUpdated"]);
      expect(result.cachedBuilds).toEqual([{ id: 1 }]);
      expect(result.cachedPRs).toEqual([{ id: 2 }]);
      expect(result.lastUpdated).toBe("2025-02-26");
    });

    it("should return partial results for missing keys", async () => {
      mockStorage.cachedBuilds = [{ id: 1 }];

      const result = await getStorageMulti(["cachedBuilds", "cachedPRs"]);
      expect(result.cachedBuilds).toEqual([{ id: 1 }]);
      expect(result.cachedPRs).toBeUndefined();
    });
  });

  describe("onStorageChange", () => {
    it("should register a listener", () => {
      const callback = vi.fn();
      onStorageChange("cachedBuilds", callback);
      expect(chrome.storage.onChanged.addListener).toHaveBeenCalledTimes(1);
    });

    it("should return an unsubscribe function that removes the listener", () => {
      const callback = vi.fn();
      const unsub = onStorageChange("cachedBuilds", callback);
      unsub();
      expect(chrome.storage.onChanged.removeListener).toHaveBeenCalledTimes(1);
    });

    it("should call callback when matching key changes", () => {
      const callback = vi.fn();
      let registeredListener: (changes: Record<string, { newValue?: unknown }>, area: string) => void;

      vi.mocked(chrome.storage.onChanged.addListener).mockImplementation((fn) => {
        registeredListener = fn;
      });

      onStorageChange("lastUpdated", callback);

      // Simulate a storage change
      registeredListener!({ lastUpdated: { newValue: "2025-02-26" } }, "local");
      expect(callback).toHaveBeenCalledWith("2025-02-26");
    });

    it("should NOT call callback for a different key", () => {
      const callback = vi.fn();
      let registeredListener: (changes: Record<string, { newValue?: unknown }>, area: string) => void;

      vi.mocked(chrome.storage.onChanged.addListener).mockImplementation((fn) => {
        registeredListener = fn;
      });

      onStorageChange("lastUpdated", callback);

      registeredListener!({ cachedBuilds: { newValue: [] } }, "local");
      expect(callback).not.toHaveBeenCalled();
    });

    it("should NOT call callback for non-local area changes", () => {
      const callback = vi.fn();
      let registeredListener: (changes: Record<string, { newValue?: unknown }>, area: string) => void;

      vi.mocked(chrome.storage.onChanged.addListener).mockImplementation((fn) => {
        registeredListener = fn;
      });

      onStorageChange("lastUpdated", callback);

      registeredListener!({ lastUpdated: { newValue: "val" } }, "sync");
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
