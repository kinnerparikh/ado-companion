import { scenarios } from "./ado-data";

type Scenario = (typeof scenarios)[keyof typeof scenarios];

// In-memory storage for the dev harness
let storage: Record<string, unknown> = {};
const listeners: Array<
  (changes: Record<string, { newValue?: unknown }>, areaName: string) => void
> = [];

function setMockStorage(data: Record<string, unknown>) {
  const changes: Record<string, { newValue?: unknown }> = {};
  for (const [key, value] of Object.entries(data)) {
    changes[key] = { newValue: value };
    storage[key] = value;
  }
  for (const listener of listeners) {
    listener(changes, "local");
  }
}

/**
 * Load a scenario into mock storage.
 */
export function loadScenario(scenario: Scenario) {
  setMockStorage({
    config: scenario.config,
    cachedBuilds: scenario.builds,
    cachedRecentBuilds: scenario.recentBuilds,
    cachedPRs: scenario.prs,
    lastUpdated: scenario.lastUpdated,
    errorState: scenario.errorState,
    userIdentity: scenario.config.pat
      ? { id: "mock-user-id", displayName: "Mock User", uniqueName: "mock@user.com" }
      : null,
    managedBookmarkIds: [],
  });
}

// Install mock Chrome APIs on globalThis
const mockChrome = {
  storage: {
    local: {
      get: (keys: string | string[]) => {
        const keyArr = typeof keys === "string" ? [keys] : keys;
        const result: Record<string, unknown> = {};
        for (const k of keyArr) {
          if (k in storage) result[k] = storage[k];
        }
        return Promise.resolve(result);
      },
      set: (items: Record<string, unknown>) => {
        setMockStorage(items);
        return Promise.resolve();
      },
    },
    onChanged: {
      addListener: (fn: (changes: Record<string, { newValue?: unknown }>, area: string) => void) => {
        listeners.push(fn);
      },
      removeListener: (fn: (changes: Record<string, { newValue?: unknown }>, area: string) => void) => {
        const idx = listeners.indexOf(fn);
        if (idx >= 0) listeners.splice(idx, 1);
      },
    },
  },
  runtime: {
    sendMessage: () => Promise.resolve(),
    openOptionsPage: () => {
      console.log("[Dev Harness] openOptionsPage called");
    },
  },
  bookmarks: {
    getTree: () => Promise.resolve([{ children: [{ id: "1", title: "Bookmarks Bar" }, { id: "2", title: "Other Bookmarks", children: [] }] }]),
    getChildren: () => Promise.resolve([]),
    create: (props: { title: string; url?: string; parentId: string }) => Promise.resolve({ id: `bm-${Date.now()}`, ...props }),
    remove: () => Promise.resolve(),
  },
  alarms: {
    create: () => Promise.resolve(),
    clear: () => Promise.resolve(),
    onAlarm: { addListener: () => {} },
  },
  action: {
    setBadgeText: () => Promise.resolve(),
    setBadgeBackgroundColor: () => Promise.resolve(),
  },
  notifications: {
    create: (_id: string, _opts: unknown) => Promise.resolve(),
    clear: () => Promise.resolve(),
    onClicked: { addListener: () => {} },
  },
  tabs: {
    create: () => Promise.resolve(),
  },
};

(globalThis as Record<string, unknown>).chrome = mockChrome;

// Load default scenario
loadScenario(scenarios.connected);
