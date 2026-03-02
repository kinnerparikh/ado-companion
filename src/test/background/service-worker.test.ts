import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AdoBuildList, AdoTimeline } from "@/api/types";
import type { ExtensionConfig, WatchedBuild } from "@/storage/types";

// Capture the onMessage listener registered by the service worker
let onMessageCallback: (
  message: { type: string; payload?: unknown },
  sender: unknown,
  sendResponse: (response: unknown) => void
) => boolean | void;

// Storage state for this test suite
let storageState: Record<string, unknown> = {};

// Must set up all chrome mocks before the service worker module is imported
beforeEach(() => {
  storageState = {};

  const mockChrome = {
    storage: {
      local: {
        get: vi.fn((keys: string | string[]) => {
          const keyArr = typeof keys === "string" ? [keys] : keys;
          const result: Record<string, unknown> = {};
          for (const k of keyArr) {
            if (k in storageState) result[k] = storageState[k];
          }
          return Promise.resolve(result);
        }),
        set: vi.fn((items: Record<string, unknown>) => {
          Object.assign(storageState, items);
          return Promise.resolve();
        }),
      },
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
    runtime: {
      onInstalled: { addListener: vi.fn() },
      onStartup: { addListener: vi.fn() },
      onMessage: {
        addListener: vi.fn(
          (
            cb: (
              message: { type: string; payload?: unknown },
              sender: unknown,
              sendResponse: (response: unknown) => void
            ) => boolean | void
          ) => {
            onMessageCallback = cb;
          }
        ),
      },
      sendMessage: vi.fn(() => Promise.resolve()),
    },
    notifications: {
      create: vi.fn(),
      clear: vi.fn(),
      onClicked: { addListener: vi.fn() },
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
    tabs: { create: vi.fn() },
    bookmarks: {
      getTree: vi.fn(() =>
        Promise.resolve([{ children: [{ id: "2", title: "Other Bookmarks", children: [] }] }])
      ),
      getChildren: vi.fn(() => Promise.resolve([])),
      create: vi.fn((props: unknown) => Promise.resolve({ id: "bm-1", ...(props as object) })),
      remove: vi.fn(() => Promise.resolve()),
    },
  };

  (globalThis as Record<string, unknown>).chrome = mockChrome;
});

function mockBuild(id: number, project: string, status = "inProgress") {
  return {
    id,
    buildNumber: `build-${id}`,
    status,
    result: status === "completed" ? "succeeded" : undefined,
    queueTime: "2026-01-01T00:00:00Z",
    startTime: "2026-01-01T00:01:00Z",
    definition: { id: 1, name: `Pipeline-${id}` },
    project: { id: `proj-${project}`, name: project },
    requestedFor: { id: "user-1", displayName: "User", uniqueName: "user@test.com" },
    requestedBy: { id: "user-1", displayName: "User", uniqueName: "user@test.com" },
    sourceBranch: "refs/heads/main",
    _links: { web: { href: `https://dev.azure.com/org/${project}/_build/results?buildId=${id}` } },
  };
}

const emptyTimeline: AdoTimeline = { records: [] };
const emptyBuildList: AdoBuildList = { count: 0, value: [] };

function mockJsonResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: { get: (name: string) => (name === "content-type" ? "application/json" : null) },
    json: () => Promise.resolve(data),
  } as unknown as Response;
}

function connectionDataResponse() {
  return mockJsonResponse({
    authenticatedUser: {
      id: "user-1",
      providerDisplayName: "User",
      properties: { Account: { $value: "user@test.com" } },
    },
    authorizedUser: { id: "user-1", providerDisplayName: "User" },
  });
}

function baseConfig(): ExtensionConfig {
  return {
    organization: "myorg",
    pat: "test-pat",
    projects: ["ProjectA", "ProjectB"],
    activePollingInterval: 30,
    idlePollingInterval: 120,
    prSectionEnabled: false,
    bookmarksEnabled: false,
    bookmarkFolderName: "Open PRs",
    showCanceledBuilds: false,
    recentBuildsHours: 48,
    maxCompletedBuilds: 10,
    maxFailedBuilds: 10,
    sectionOrder: ["pullRequests", "activePipelines", "completed", "failed"],
    notificationsEnabled: false,
  };
}

async function importAndTriggerPoll(): Promise<void> {
  vi.resetModules();
  await import("@/background/service-worker");
  return new Promise<void>((resolve) => {
    onMessageCallback({ type: "REFRESH_NOW" }, {}, () => resolve());
  });
}

describe("service-worker poll batching & parallelization", () => {
  it("should use getBuildsBatch for watched builds instead of individual getBuild calls", async () => {
    const config = baseConfig();
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const watchedBuilds: WatchedBuild[] = [
      { buildId: 100, project: "ProjectA", organization: "myorg", trackedAt: new Date().toISOString(), expiresAt: futureDate },
      { buildId: 101, project: "ProjectA", organization: "myorg", trackedAt: new Date().toISOString(), expiresAt: futureDate },
      { buildId: 200, project: "ProjectB", organization: "myorg", trackedAt: new Date().toISOString(), expiresAt: futureDate },
    ];

    storageState = { config, watchedBuilds, cachedBuilds: [] };

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy.mockResolvedValueOnce(connectionDataResponse());
    // Running builds for ProjectA & ProjectB (parallel)
    fetchSpy.mockResolvedValueOnce(mockJsonResponse(emptyBuildList));
    fetchSpy.mockResolvedValueOnce(mockJsonResponse(emptyBuildList));
    // Recent builds for ProjectA & ProjectB (parallel)
    fetchSpy.mockResolvedValueOnce(mockJsonResponse(emptyBuildList));
    fetchSpy.mockResolvedValueOnce(mockJsonResponse(emptyBuildList));
    // Batch watched builds for ProjectA (100, 101) and ProjectB (200)
    fetchSpy.mockResolvedValueOnce(
      mockJsonResponse({
        count: 2,
        value: [mockBuild(100, "ProjectA", "completed"), mockBuild(101, "ProjectA", "inProgress")],
      })
    );
    fetchSpy.mockResolvedValueOnce(
      mockJsonResponse({ count: 1, value: [mockBuild(200, "ProjectB", "completed")] })
    );
    // Timeline for watched active build 101
    fetchSpy.mockResolvedValueOnce(mockJsonResponse(emptyTimeline));

    await importAndTriggerPoll();

    const fetchUrls = fetchSpy.mock.calls.map((call) => call[0] as string);

    // Should have batch URLs with buildIds
    const batchUrlA = fetchUrls.find(
      (url) => url.includes("ProjectA") && url.includes("buildIds=")
    );
    expect(batchUrlA).toBeDefined();
    expect(batchUrlA).toMatch(/buildIds=100,101|buildIds=101,100/);

    const batchUrlB = fetchUrls.find(
      (url) => url.includes("ProjectB") && url.includes("buildIds=")
    );
    expect(batchUrlB).toBeDefined();
    expect(batchUrlB).toContain("buildIds=200");

    // Should NOT have individual build URLs (/builds/{id}?api-version=)
    const individualBuildUrls = fetchUrls.filter(
      (url) => /\/builds\/\d+\?api-version=/.test(url)
    );
    expect(individualBuildUrls).toHaveLength(0);

    fetchSpy.mockRestore();
  });

  it("should fetch running builds for all projects in parallel", async () => {
    const config = baseConfig();
    config.projects = ["ProjA", "ProjB", "ProjC"];
    storageState = { config, cachedBuilds: [] };

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy.mockResolvedValueOnce(connectionDataResponse());
    // Running builds for 3 projects
    fetchSpy.mockResolvedValueOnce(mockJsonResponse(emptyBuildList));
    fetchSpy.mockResolvedValueOnce(mockJsonResponse(emptyBuildList));
    fetchSpy.mockResolvedValueOnce(mockJsonResponse(emptyBuildList));
    // Recent builds for 3 projects
    fetchSpy.mockResolvedValueOnce(mockJsonResponse(emptyBuildList));
    fetchSpy.mockResolvedValueOnce(mockJsonResponse(emptyBuildList));
    fetchSpy.mockResolvedValueOnce(mockJsonResponse(emptyBuildList));

    await importAndTriggerPoll();

    const fetchUrls = fetchSpy.mock.calls.map((call) => call[0] as string);
    const runningUrls = fetchUrls.filter((url) => url.includes("statusFilter=inProgress"));
    expect(runningUrls).toHaveLength(3);
    expect(runningUrls.some((u) => u.includes("ProjA"))).toBe(true);
    expect(runningUrls.some((u) => u.includes("ProjB"))).toBe(true);
    expect(runningUrls.some((u) => u.includes("ProjC"))).toBe(true);

    fetchSpy.mockRestore();
  });

  it("should fetch timelines for multiple running builds in parallel", async () => {
    const config = baseConfig();
    config.projects = ["ProjectA"];
    storageState = { config, cachedBuilds: [] };

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy.mockResolvedValueOnce(connectionDataResponse());
    // Running builds - return 2 builds
    fetchSpy.mockResolvedValueOnce(
      mockJsonResponse({ count: 2, value: [mockBuild(10, "ProjectA"), mockBuild(20, "ProjectA")] })
    );
    // Timelines for builds 10 and 20
    fetchSpy.mockResolvedValueOnce(mockJsonResponse(emptyTimeline));
    fetchSpy.mockResolvedValueOnce(mockJsonResponse(emptyTimeline));
    // Recent builds
    fetchSpy.mockResolvedValueOnce(mockJsonResponse(emptyBuildList));

    await importAndTriggerPoll();

    const fetchUrls = fetchSpy.mock.calls.map((call) => call[0] as string);
    const timelineUrls = fetchUrls.filter((url) => url.includes("/timeline"));
    expect(timelineUrls).toHaveLength(2);
    expect(timelineUrls.some((u) => u.includes("/builds/10/timeline"))).toBe(true);
    expect(timelineUrls.some((u) => u.includes("/builds/20/timeline"))).toBe(true);

    fetchSpy.mockRestore();
  });

  it("should skip batch fetch for watched builds already in active list", async () => {
    const config = baseConfig();
    config.projects = ["ProjectA"];
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const watchedBuilds: WatchedBuild[] = [
      { buildId: 10, project: "ProjectA", organization: "myorg", trackedAt: new Date().toISOString(), expiresAt: futureDate },
    ];

    storageState = { config, watchedBuilds, cachedBuilds: [] };

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy.mockResolvedValueOnce(connectionDataResponse());
    // Running builds - build 10 is already active
    fetchSpy.mockResolvedValueOnce(
      mockJsonResponse({ count: 1, value: [mockBuild(10, "ProjectA")] })
    );
    // Timeline for build 10
    fetchSpy.mockResolvedValueOnce(mockJsonResponse(emptyTimeline));
    // Recent builds
    fetchSpy.mockResolvedValueOnce(mockJsonResponse(emptyBuildList));

    await importAndTriggerPoll();

    const fetchUrls = fetchSpy.mock.calls.map((call) => call[0] as string);

    // No batch buildIds calls since build 10 is already in active builds
    const batchUrls = fetchUrls.filter((url) => url.includes("buildIds="));
    expect(batchUrls).toHaveLength(0);

    fetchSpy.mockRestore();
  });

  it("should fetch PRs for all projects in parallel when enabled", async () => {
    const config = baseConfig();
    config.prSectionEnabled = true;
    config.projects = ["ProjA", "ProjB"];
    storageState = { config, cachedBuilds: [] };

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy.mockResolvedValueOnce(connectionDataResponse());
    // Running builds (2 projects)
    fetchSpy.mockResolvedValueOnce(mockJsonResponse(emptyBuildList));
    fetchSpy.mockResolvedValueOnce(mockJsonResponse(emptyBuildList));
    // Recent builds (2 projects)
    fetchSpy.mockResolvedValueOnce(mockJsonResponse(emptyBuildList));
    fetchSpy.mockResolvedValueOnce(mockJsonResponse(emptyBuildList));
    // PRs for 2 projects
    fetchSpy.mockResolvedValueOnce(mockJsonResponse({ count: 0, value: [] }));
    fetchSpy.mockResolvedValueOnce(mockJsonResponse({ count: 0, value: [] }));

    await importAndTriggerPoll();

    const fetchUrls = fetchSpy.mock.calls.map((call) => call[0] as string);
    const prUrls = fetchUrls.filter((url) => url.includes("/pullrequests"));
    expect(prUrls).toHaveLength(2);
    expect(prUrls.some((u) => u.includes("ProjA"))).toBe(true);
    expect(prUrls.some((u) => u.includes("ProjB"))).toBe(true);

    fetchSpy.mockRestore();
  });
});
