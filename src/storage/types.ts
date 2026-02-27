import type { SectionId } from "@/shared/constants";

/** Configuration stored by the extension */
export interface ExtensionConfig {
  organization: string;
  pat: string;
  projects: string[]; // e.g. ["project1", "project2"] or ["*"]
  activePollingInterval: number; // seconds
  idlePollingInterval: number; // seconds
  prSectionEnabled: boolean;
  bookmarksEnabled: boolean;
  bookmarkFolderName: string;
  showCanceledBuilds: boolean;
  recentBuildsHours: number; // how far back to fetch completed builds
  maxCompletedBuilds: number; // max completed builds to display
  maxFailedBuilds: number; // max failed builds to display
  sectionOrder: SectionId[]; // order of popup sections
  notificationsEnabled: boolean; // send browser notification when pipeline completes
}

/** Error state stored in storage */
export interface ErrorState {
  type: "auth_failed" | "pat_expired" | "network_error" | "unknown";
  message: string;
  timestamp: string;
}

/** User identity from ADO */
export interface UserIdentity {
  id: string;
  displayName: string;
  uniqueName: string;
}

/** All data stored in chrome.storage.local */
export interface StorageSchema {
  config: ExtensionConfig;
  cachedBuilds: CachedBuild[];
  cachedRecentBuilds: CachedBuild[];
  cachedPRs: CachedPR[];
  lastUpdated: string | null;
  errorState: ErrorState | null;
  userIdentity: UserIdentity | null;
  managedBookmarkIds: string[];
}

/** Cached build entry */
export interface CachedBuild {
  id: number;
  buildNumber: string;
  definitionName: string;
  projectName: string;
  status: "inProgress" | "completed" | "cancelling" | "notStarted";
  result?: "succeeded" | "failed" | "canceled" | "partiallySucceeded";
  startTime: string;
  queueTime: string;
  url: string; // link to ADO
  jobs: CachedJob[];
  totalTasks: number;
  completedTasks: number;
}

/** Cached job entry (within a build) */
export interface CachedJob {
  name: string;
  state: "pending" | "inProgress" | "completed";
  result?: "succeeded" | "failed" | "canceled" | "skipped";
  totalTasks: number;
  completedTasks: number;
}

/** Cached PR entry */
export interface CachedPR {
  id: number;
  title: string;
  projectName: string;
  repositoryName: string;
  url: string; // link to ADO
  createdDate: string;
  lastUpdated: string;
  isDraft: boolean;
  status: "active" | "completed" | "abandoned";
  mergeStatus?: "conflicts" | "succeeded" | "queued" | "rejectedByPolicy" | "failure" | "notSet";
  approvalCount: number; // number of approvals (vote >= 5)
  waitingCount: number; // number of "wait for author" (vote === -5)
  rejectionCount: number; // number of rejections (vote === -10)
}
