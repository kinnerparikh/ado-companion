// Default polling intervals in seconds
export const DEFAULT_ACTIVE_POLL_INTERVAL = 30;
export const DEFAULT_IDLE_POLL_INTERVAL = 120;

// Bookmark defaults
export const DEFAULT_BOOKMARK_FOLDER = "Open PRs";

// Pipeline display defaults
export const DEFAULT_RECENT_BUILDS_HOURS = 48;
export const DEFAULT_MAX_COMPLETED_BUILDS = 10;
export const DEFAULT_MAX_FAILED_BUILDS = 10;

// Section IDs and default order
export type SectionId = "pullRequests" | "activePipelines" | "completed" | "failed";
export const DEFAULT_SECTION_ORDER: SectionId[] = [
  "pullRequests",
  "activePipelines",
  "completed",
  "failed",
];

// Watched build defaults
export const WATCHED_BUILD_EXPIRY_DAYS = 7;

// ADO API version
export const ADO_API_VERSION = "7.1";

// Alarm names
export const POLL_ALARM_NAME = "ado-companion-poll";

// Storage keys
export const STORAGE_KEYS = {
  CONFIG: "config",
  CACHED_BUILDS: "cachedBuilds",
  CACHED_PRS: "cachedPRs",
  LAST_UPDATED: "lastUpdated",
  ERROR_STATE: "errorState",
  USER_IDENTITY: "userIdentity",
  MANAGED_BOOKMARK_IDS: "managedBookmarkIds",
} as const;
