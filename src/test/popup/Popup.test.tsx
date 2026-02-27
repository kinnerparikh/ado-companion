import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import Popup from "@/popup/Popup";
import type { ExtensionConfig, CachedBuild, CachedPR } from "@/storage/types";
import {
  DEFAULT_ACTIVE_POLL_INTERVAL,
  DEFAULT_IDLE_POLL_INTERVAL,
  DEFAULT_BOOKMARK_FOLDER,
  DEFAULT_RECENT_BUILDS_HOURS,
  DEFAULT_MAX_COMPLETED_BUILDS,
  DEFAULT_MAX_FAILED_BUILDS,
} from "@/shared/constants";

const fullConfig: ExtensionConfig = {
  organization: "myorg",
  pat: "my-pat",
  projects: ["ProjectA"],
  activePollingInterval: DEFAULT_ACTIVE_POLL_INTERVAL,
  idlePollingInterval: DEFAULT_IDLE_POLL_INTERVAL,
  prSectionEnabled: true,
  bookmarksEnabled: false,
  bookmarkFolderName: DEFAULT_BOOKMARK_FOLDER,
  showCanceledBuilds: false,
  recentBuildsHours: DEFAULT_RECENT_BUILDS_HOURS,
  maxCompletedBuilds: DEFAULT_MAX_COMPLETED_BUILDS,
  maxFailedBuilds: DEFAULT_MAX_FAILED_BUILDS,
};

const mockPR: CachedPR = {
  id: 101,
  title: "My PR",
  projectName: "ProjectA",
  repositoryName: "repo",
  url: "https://example.com/pr/101",
  createdDate: "2025-02-25T10:00:00Z",
  lastUpdated: "2025-02-26T10:00:00Z",
};

const mockBuild: CachedBuild = {
  id: 5001,
  buildNumber: "20250226.1",
  definitionName: "CI Pipeline",
  projectName: "ProjectA",
  status: "inProgress",
  startTime: new Date(Date.now() - 60000).toISOString(),
  queueTime: new Date(Date.now() - 90000).toISOString(),
  url: "https://example.com/build/5001",
  totalTasks: 10,
  completedTasks: 5,
  jobs: [],
};

const mockCompletedBuild: CachedBuild = {
  id: 6001,
  buildNumber: "20250226.3",
  definitionName: "Deploy Pipeline",
  projectName: "ProjectA",
  status: "completed",
  result: "succeeded",
  startTime: new Date(Date.now() - 3600000).toISOString(),
  queueTime: new Date(Date.now() - 3600000).toISOString(),
  url: "https://example.com/build/6001",
  totalTasks: 5,
  completedTasks: 5,
  jobs: [],
};

const mockFailedBuild: CachedBuild = {
  id: 6002,
  buildNumber: "20250226.4",
  definitionName: "Test Pipeline",
  projectName: "ProjectA",
  status: "completed",
  result: "failed",
  startTime: new Date(Date.now() - 7200000).toISOString(),
  queueTime: new Date(Date.now() - 7200000).toISOString(),
  url: "https://example.com/build/6002",
  totalTasks: 8,
  completedTasks: 3,
  jobs: [],
};

function seedStorage(data: Record<string, unknown>) {
  vi.mocked(chrome.storage.local.get).mockImplementation((keys: string | string[]) => {
    const keyArr = typeof keys === "string" ? [keys] : keys;
    const result: Record<string, unknown> = {};
    for (const k of keyArr) {
      if (k in data) result[k] = data[k];
    }
    return Promise.resolve(result);
  });
}

describe("Popup", () => {
  beforeEach(() => {
    vi.mocked(chrome.runtime.sendMessage).mockClear();
    vi.mocked(chrome.runtime.openOptionsPage).mockClear();
  });

  it("shows loading state initially", () => {
    // Never resolve storage to keep loading
    vi.mocked(chrome.storage.local.get).mockReturnValue(new Promise(() => {}));
    render(<Popup />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows 'Not configured' when no org/pat set", async () => {
    seedStorage({ config: { ...fullConfig, organization: "", pat: "" } });
    render(<Popup />);
    await waitFor(() => {
      expect(screen.getByText("Not configured")).toBeInTheDocument();
    });
  });

  it("shows 'Open Settings' button when not configured", async () => {
    seedStorage({ config: { ...fullConfig, organization: "", pat: "" } });
    render(<Popup />);
    await waitFor(() => {
      expect(screen.getByText("Open Settings")).toBeInTheDocument();
    });
  });

  it("shows PAT expired state", async () => {
    seedStorage({
      config: fullConfig,
      errorState: {
        type: "pat_expired",
        message: "Your PAT is invalid or has expired.",
        timestamp: new Date().toISOString(),
      },
    });
    render(<Popup />);
    await waitFor(() => {
      expect(screen.getByText("PAT expired")).toBeInTheDocument();
      expect(screen.getByText("Update PAT")).toBeInTheDocument();
    });
  });

  it("shows auth failed state", async () => {
    seedStorage({
      config: fullConfig,
      errorState: {
        type: "auth_failed",
        message: "Auth failure",
        timestamp: new Date().toISOString(),
      },
    });
    render(<Popup />);
    await waitFor(() => {
      expect(screen.getByText("Authentication failed")).toBeInTheDocument();
    });
  });

  it("renders PR section when enabled", async () => {
    seedStorage({
      config: fullConfig,
      cachedPRs: [mockPR],
      cachedBuilds: [],
    });
    render(<Popup />);
    await waitFor(() => {
      expect(screen.getByText(/Pull Requests/)).toBeInTheDocument();
      expect(screen.getByText("My PR")).toBeInTheDocument();
    });
  });

  it("hides PR section when disabled", async () => {
    seedStorage({
      config: { ...fullConfig, prSectionEnabled: false },
      cachedPRs: [mockPR],
      cachedBuilds: [],
    });
    render(<Popup />);
    await waitFor(() => {
      expect(screen.getByText(/Active Pipelines/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Pull Requests/)).not.toBeInTheDocument();
  });

  it("renders running pipelines section", async () => {
    seedStorage({
      config: fullConfig,
      cachedBuilds: [mockBuild],
      cachedPRs: [],
    });
    render(<Popup />);
    await waitFor(() => {
      expect(screen.getByText(/Active Pipelines/)).toBeInTheDocument();
      expect(screen.getByText("CI Pipeline")).toBeInTheDocument();
    });
  });

  it("renders completed and failed sections", async () => {
    seedStorage({
      config: fullConfig,
      cachedBuilds: [],
      cachedRecentBuilds: [mockCompletedBuild, mockFailedBuild],
      cachedPRs: [],
    });
    render(<Popup />);
    await waitFor(() => {
      expect(screen.getByText(/Completed \(48h\)/)).toBeInTheDocument();
      expect(screen.getByText(/Failed \(48h\)/)).toBeInTheDocument();
    });
  });

  it("sends REFRESH_NOW message on mount", async () => {
    seedStorage({ config: fullConfig, cachedBuilds: [], cachedPRs: [] });
    render(<Popup />);
    await waitFor(() => {
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: "REFRESH_NOW" });
    });
  });

  it("renders status bar", async () => {
    const lastUpdated = new Date(Date.now() - 120000).toISOString();
    seedStorage({
      config: fullConfig,
      cachedBuilds: [],
      cachedPRs: [],
      lastUpdated,
    });
    render(<Popup />);
    await waitFor(() => {
      expect(screen.getByText(/Updated 2m ago/)).toBeInTheDocument();
    });
  });
});
