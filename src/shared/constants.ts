// Default polling intervals in seconds
export const DEFAULT_ACTIVE_POLL_INTERVAL = 30;
export const DEFAULT_IDLE_POLL_INTERVAL = 120;

// Bookmark defaults
export const DEFAULT_BOOKMARK_FOLDER = "Open PRs";

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
