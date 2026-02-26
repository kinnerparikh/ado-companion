import "@testing-library/jest-dom/vitest";

// Mock Chrome APIs globally for tests
const storage: Record<string, unknown> = {};
const listeners: Array<(changes: Record<string, { newValue?: unknown }>, area: string) => void> = [];

const mockChrome = {
  storage: {
    local: {
      get: vi.fn((keys: string | string[]) => {
        const keyArr = typeof keys === "string" ? [keys] : keys;
        const result: Record<string, unknown> = {};
        for (const k of keyArr) {
          if (k in storage) result[k] = storage[k];
        }
        return Promise.resolve(result);
      }),
      set: vi.fn((items: Record<string, unknown>) => {
        for (const [key, value] of Object.entries(items)) {
          storage[key] = value;
          for (const listener of listeners) {
            listener({ [key]: { newValue: value } }, "local");
          }
        }
        return Promise.resolve();
      }),
    },
    onChanged: {
      addListener: vi.fn((fn: (changes: Record<string, { newValue?: unknown }>, area: string) => void) => {
        listeners.push(fn);
      }),
      removeListener: vi.fn((fn: (changes: Record<string, { newValue?: unknown }>, area: string) => void) => {
        const idx = listeners.indexOf(fn);
        if (idx >= 0) listeners.splice(idx, 1);
      }),
    },
  },
  runtime: {
    sendMessage: vi.fn(() => Promise.resolve()),
    openOptionsPage: vi.fn(),
  },
  bookmarks: {
    getTree: vi.fn(() =>
      Promise.resolve([
        {
          children: [
            { id: "1", title: "Bookmarks Bar" },
            { id: "2", title: "Other Bookmarks", children: [] },
          ],
        },
      ])
    ),
    getChildren: vi.fn(() => Promise.resolve([])),
    create: vi.fn((props: { title: string; url?: string; parentId: string }) =>
      Promise.resolve({ id: `bm-${Math.random()}`, ...props })
    ),
    remove: vi.fn(() => Promise.resolve()),
  },
  action: {
    setBadgeText: vi.fn(() => Promise.resolve()),
    setBadgeBackgroundColor: vi.fn(() => Promise.resolve()),
  },
  alarms: {
    create: vi.fn(() => Promise.resolve()),
    clear: vi.fn(() => Promise.resolve()),
    onAlarm: { addListener: vi.fn() },
  },
};

(globalThis as Record<string, unknown>).chrome = mockChrome;
