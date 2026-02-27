import { AdoClient, AdoApiError } from "@/api/ado-client";
import { buildWebUrl, prWebUrl } from "@/api/endpoints";
import type { AdoTimeline, AdoBuild } from "@/api/types";
import { BookmarkManager } from "@/bookmarks/bookmark-manager";
import { POLL_ALARM_NAME } from "@/shared/constants";
import { getStorage, setStorage } from "@/storage/chrome-storage";
import type {
  CachedBuild,
  CachedJob,
  CachedPR,
  ExtensionConfig,
  ErrorState,
  UserIdentity,
} from "@/storage/types";

const bookmarkManager = new BookmarkManager();

/**
 * Resolve which projects to poll.
 * If "*", fetch all projects from ADO. Otherwise use explicit list.
 */
async function resolveProjects(
  client: AdoClient,
  config: ExtensionConfig
): Promise<string[]> {
  if (config.projects.includes("*")) {
    const data = await client.getProjects();
    return data.value.map((p) => p.name);
  }
  return config.projects;
}

/**
 * Check if a build is "mine" based on the user identity.
 */
function isBuildMine(build: AdoBuild, userId: string): boolean {
  return (
    build.requestedFor.id === userId || build.requestedBy.id === userId
  );
}

/**
 * Extract job-level progress from a build timeline.
 */
function extractJobProgress(timeline: AdoTimeline): {
  jobs: CachedJob[];
  totalTasks: number;
  completedTasks: number;
} {
  const jobs: CachedJob[] = [];
  let totalTasks = 0;
  let completedTasks = 0;

  // Find all Job records
  const jobRecords = timeline.records.filter((r) => r.type === "Job");
  const taskRecords = timeline.records.filter((r) => r.type === "Task");

  for (const job of jobRecords) {
    const jobTasks = taskRecords.filter((t) => t.parentId === job.id);
    const completed = jobTasks.filter((t) => t.state === "completed").length;

    jobs.push({
      name: job.name,
      state: job.state,
      result: job.result as CachedJob["result"],
      totalTasks: jobTasks.length,
      completedTasks: completed,
    });

    totalTasks += jobTasks.length;
    completedTasks += completed;
  }

  return { jobs, totalTasks, completedTasks };
}

/**
 * Main polling function. Fetches builds and PRs, updates storage.
 */
async function poll(): Promise<void> {
  const config = await getStorage("config");
  if (!config?.organization || !config?.pat) return;

  const client = new AdoClient(config.organization, config.pat);

  let userIdentity: UserIdentity | null = null;
  try {
    // Validate PAT and get user identity
    const connData = await client.getConnectionData();
    userIdentity = {
      id: connData.authenticatedUser.id,
      displayName: connData.authenticatedUser.providerDisplayName,
      uniqueName:
        connData.authenticatedUser.properties?.Account?.$value ?? "",
    };
    await setStorage("userIdentity", userIdentity);
    await setStorage("errorState", null);
  } catch (err) {
    if (err instanceof AdoApiError && (err.status === 401 || err.status === 403)) {
      const errorState: ErrorState = {
        type: err.status === 401 ? "pat_expired" : "auth_failed",
        message: "Your PAT is invalid or has expired.",
        timestamp: new Date().toISOString(),
      };
      await setStorage("errorState", errorState);
    } else {
      await setStorage("errorState", {
        type: "network_error",
        message: err instanceof Error ? err.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
    return;
  }

  try {
    const projects = await resolveProjects(client, config);

    // Fetch running builds
    const allBuilds: CachedBuild[] = [];
    for (const project of projects) {
      try {
        const buildsData = await client.getRunningBuilds(project, userIdentity!.id);
        const myBuilds = buildsData.value.filter((b) =>
          isBuildMine(b, userIdentity!.id)
        );

        for (const build of myBuilds) {
          let jobs: CachedJob[] = [];
          let totalTasks = 0;
          let completedTasks = 0;

          try {
            const timeline = await client.getBuildTimeline(project, build.id);
            const progress = extractJobProgress(timeline);
            jobs = progress.jobs;
            totalTasks = progress.totalTasks;
            completedTasks = progress.completedTasks;
          } catch {
            // Timeline may not be available yet
          }

          allBuilds.push({
            id: build.id,
            buildNumber: build.buildNumber,
            definitionName: build.definition.name,
            projectName: project,
            status: build.status as CachedBuild["status"],
            result: build.result as CachedBuild["result"],
            startTime: build.startTime ?? build.queueTime,
            queueTime: build.queueTime,
            url: buildWebUrl(config.organization, project, build.id),
            jobs,
            totalTasks,
            completedTasks,
          });
        }
      } catch {
        // Skip project on error
      }
    }

    await setStorage("cachedBuilds", allBuilds);

    // Fetch recently completed builds (last 24h)
    const recentBuilds: CachedBuild[] = [];
    const minFinishTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    for (const project of projects) {
      try {
        const recentData = await client.getRecentBuilds(project, minFinishTime, userIdentity!.id);
        const myRecent = recentData.value.filter((b) =>
          isBuildMine(b, userIdentity!.id)
        );

        for (const build of myRecent) {
          recentBuilds.push({
            id: build.id,
            buildNumber: build.buildNumber,
            definitionName: build.definition.name,
            projectName: project,
            status: build.status as CachedBuild["status"],
            result: build.result as CachedBuild["result"],
            startTime: build.startTime ?? build.queueTime,
            queueTime: build.queueTime,
            url: buildWebUrl(config.organization, project, build.id),
            jobs: [],
            totalTasks: 0,
            completedTasks: 0,
          });
        }
      } catch {
        // Skip project on error
      }
    }

    await setStorage("cachedRecentBuilds", recentBuilds);

    // Fetch PRs if enabled
    if (config.prSectionEnabled) {
      const allPRs: CachedPR[] = [];
      for (const project of projects) {
        try {
          const prsData = await client.getActivePullRequests(
            project,
            userIdentity.id
          );
          for (const pr of prsData.value) {
            allPRs.push({
              id: pr.pullRequestId,
              title: pr.title,
              projectName: project,
              repositoryName: pr.repository.name,
              url:
                pr._links?.web?.href ??
                prWebUrl(
                  config.organization,
                  project,
                  pr.repository.name,
                  pr.pullRequestId
                ),
              createdDate: pr.creationDate,
              lastUpdated: pr.closedDate ?? pr.creationDate,
            });
          }
        } catch {
          // Skip project on error
        }
      }

      await setStorage("cachedPRs", allPRs);

      // Sync bookmarks if enabled
      if (config.bookmarksEnabled) {
        try {
          await bookmarkManager.syncBookmarks(allPRs, config.bookmarkFolderName);
        } catch {
          // Bookmark sync failure is non-critical
        }
      }
    }

    await setStorage("lastUpdated", new Date().toISOString());

    // Adjust polling interval based on active builds
    const interval =
      allBuilds.length > 0
        ? config.activePollingInterval
        : config.idlePollingInterval;

    await chrome.alarms.clear(POLL_ALARM_NAME);
    await chrome.alarms.create(POLL_ALARM_NAME, {
      delayInMinutes: interval / 60,
    });

    // Update badge
    if (allBuilds.length > 0) {
      await chrome.action.setBadgeText({ text: String(allBuilds.length) });
      await chrome.action.setBadgeBackgroundColor({ color: "#3b82f6" });
    } else {
      await chrome.action.setBadgeText({ text: "" });
    }
  } catch (err) {
    await setStorage("errorState", {
      type: "network_error",
      message: err instanceof Error ? err.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
}

// --- Event Listeners ---

// Initial poll on install/startup
chrome.runtime.onInstalled.addListener(() => {
  poll();
});

chrome.runtime.onStartup.addListener(() => {
  poll();
});

// Alarm-based polling
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === POLL_ALARM_NAME) {
    poll();
  }
});

// Handle messages from popup/options
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "REFRESH_NOW" || message.type === "CONFIG_UPDATED") {
    poll().then(() => sendResponse({ ok: true }));
    return true; // async response
  }
});

// Start initial alarm
chrome.alarms.create(POLL_ALARM_NAME, {
  delayInMinutes: 0.5,
  periodInMinutes: 2,
});
