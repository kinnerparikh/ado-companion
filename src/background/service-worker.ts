import { AdoClient, AdoApiError } from "@/api/ado-client";
import { buildWebUrl, prWebUrl } from "@/api/endpoints";
import type { AdoTimeline, AdoBuild } from "@/api/types";
import { BookmarkManager } from "@/bookmarks/bookmark-manager";
import { POLL_ALARM_NAME, WATCHED_BUILD_EXPIRY_DAYS } from "@/shared/constants";
import { getStorage, setStorage } from "@/storage/chrome-storage";
import type {
  CachedBuild,
  CachedJob,
  CachedPR,
  ExtensionConfig,
  ErrorState,
  UserIdentity,
  WatchedBuild,
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

    // Snapshot previous active build IDs for completion detection
    const previousActiveBuilds = (await getStorage("cachedBuilds")) ?? [];
    const previousActiveIds = new Set(previousActiveBuilds.map((b) => b.id));

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

    // Fetch recently completed builds
    const recentBuilds: CachedBuild[] = [];
    const recentHours = config.recentBuildsHours ?? 48;
    const minFinishTime = new Date(Date.now() - recentHours * 60 * 60 * 1000).toISOString();
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

    // Fetch watched builds and route to appropriate lists
    const watchedEntries = (await getStorage("watchedBuilds")) ?? [];
    const now = Date.now();
    const validWatched = watchedEntries.filter(
      (w) => new Date(w.expiresAt).getTime() > now
    );
    if (validWatched.length !== watchedEntries.length) {
      await setStorage("watchedBuilds", validWatched);
    }
    // Mark any active builds that are also watched
    const watchedIds = new Set(validWatched.map((w) => w.buildId));
    for (const b of allBuilds) {
      if (watchedIds.has(b.id)) b.watched = true;
    }
    // Fetch each watched build not already in active or recent lists
    const activeBuildIds = new Set(allBuilds.map((b) => b.id));
    const recentBuildIds = new Set(recentBuilds.map((b) => b.id));
    for (const watched of validWatched) {
      if (activeBuildIds.has(watched.buildId)) continue;
      try {
        const build = await client.getBuild(watched.project, watched.buildId);
        const cached: CachedBuild = {
          id: build.id,
          buildNumber: build.buildNumber,
          definitionName: build.definition.name,
          projectName: watched.project,
          status: build.status as CachedBuild["status"],
          result: build.result as CachedBuild["result"],
          startTime: build.startTime ?? build.queueTime,
          queueTime: build.queueTime,
          url: buildWebUrl(config.organization, watched.project, build.id),
          jobs: [],
          totalTasks: 0,
          completedTasks: 0,
          watched: true,
        };

        if (build.status === "completed") {
          if (!recentBuildIds.has(build.id)) {
            recentBuilds.push(cached);
          } else {
            const existing = recentBuilds.find((b) => b.id === build.id);
            if (existing) existing.watched = true;
          }
        } else {
          try {
            const timeline = await client.getBuildTimeline(watched.project, build.id);
            const progress = extractJobProgress(timeline);
            cached.jobs = progress.jobs;
            cached.totalTasks = progress.totalTasks;
            cached.completedTasks = progress.completedTasks;
          } catch {
            // Timeline may not be available
          }
          allBuilds.push(cached);
        }
      } catch {
        // Skip if build can't be fetched
      }
    }

    // Re-sort and re-store active builds (watched may have been added)
    allBuilds.sort(
      (a, b) => new Date(a.queueTime).getTime() - new Date(b.queueTime).getTime()
    );
    await setStorage("cachedBuilds", allBuilds);

    await setStorage("cachedRecentBuilds", recentBuilds);

    // Send notifications for newly completed pipelines
    if (config.notificationsEnabled !== false && previousActiveIds.size > 0) {
      const currentActiveIds = new Set(allBuilds.map((b) => b.id));
      const recentById = new Map(recentBuilds.map((b) => [b.id, b]));

      for (const prevId of previousActiveIds) {
        if (!currentActiveIds.has(prevId)) {
          const finished = recentById.get(prevId);
          const prev = previousActiveBuilds.find((b) => b.id === prevId);
          const name = finished?.definitionName ?? prev?.definitionName ?? `Build ${prevId}`;
          const result = finished?.result ?? "completed";
          const icon = result === "succeeded" ? "✅" : result === "failed" ? "❌" : "⚠️";

          chrome.notifications.create(`build-${prevId}`, {
            type: "basic",
            iconUrl: "icons/icon128.png",
            title: `${icon} Pipeline ${result}`,
            message: name,
          });
        }
      }
    }

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
            const reviewers = pr.reviewers ?? [];
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
              isDraft: pr.isDraft ?? false,
              status: pr.status as CachedPR["status"],
              mergeStatus: pr.mergeStatus as CachedPR["mergeStatus"],
              approvalCount: reviewers.filter((r) => r.vote >= 5).length,
              waitingCount: reviewers.filter((r) => r.vote === -5).length,
              rejectionCount: reviewers.filter((r) => r.vote === -10).length,
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

// Open build page when notification is clicked
chrome.notifications.onClicked.addListener(async (notificationId) => {
  if (notificationId.startsWith("build-")) {
    const buildId = parseInt(notificationId.replace("build-", ""), 10);
    const recent = await getStorage("cachedRecentBuilds");
    const build = recent?.find((b) => b.id === buildId);
    if (build?.url) {
      chrome.tabs.create({ url: build.url });
    }
    chrome.notifications.clear(notificationId);
  }
});

// Handle messages from popup/options/content scripts
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "REFRESH_NOW" || message.type === "CONFIG_UPDATED") {
    poll().then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "CHECK_BUILD_TRACKED") {
    const { org, project, buildId } = message.payload;
    (async () => {
      const config = await getStorage("config");
      const isConfiguredOrg =
        config?.organization?.toLowerCase() === org.toLowerCase();
      const watchedBuilds = (await getStorage("watchedBuilds")) ?? [];
      const cachedBuilds = (await getStorage("cachedBuilds")) ?? [];
      const alreadyTracked =
        watchedBuilds.some((w) => w.buildId === buildId) ||
        cachedBuilds.some((b) => b.id === buildId);
      sendResponse({ isConfiguredOrg, alreadyTracked });
    })();
    return true;
  }

  if (message.type === "TRACK_BUILD") {
    const { org, project, buildId } = message.payload;
    (async () => {
      const watchedBuilds = (await getStorage("watchedBuilds")) ?? [];
      if (watchedBuilds.some((w) => w.buildId === buildId)) {
        sendResponse({ ok: true });
        return;
      }
      const now = new Date();
      const entry: WatchedBuild = {
        buildId,
        project,
        organization: org,
        trackedAt: now.toISOString(),
        expiresAt: new Date(
          now.getTime() + WATCHED_BUILD_EXPIRY_DAYS * 24 * 60 * 60 * 1000
        ).toISOString(),
      };
      watchedBuilds.push(entry);
      await setStorage("watchedBuilds", watchedBuilds);
      poll().then(() => sendResponse({ ok: true }));
    })();
    return true;
  }

  if (message.type === "UNWATCH_BUILD") {
    const { buildId } = message.payload;
    (async () => {
      const watchedBuilds = (await getStorage("watchedBuilds")) ?? [];
      const filtered = watchedBuilds.filter((w) => w.buildId !== buildId);
      await setStorage("watchedBuilds", filtered);
      poll().then(() => sendResponse({ ok: true }));
    })();
    return true;
  }
});

// Start initial alarm
chrome.alarms.create(POLL_ALARM_NAME, {
  delayInMinutes: 0.5,
  periodInMinutes: 2,
});
