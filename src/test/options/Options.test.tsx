import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Options from "@/options/Options";
import type { ExtensionConfig } from "@/storage/types";
import {
  DEFAULT_ACTIVE_POLL_INTERVAL,
  DEFAULT_IDLE_POLL_INTERVAL,
  DEFAULT_BOOKMARK_FOLDER,
  DEFAULT_RECENT_BUILDS_HOURS,
  DEFAULT_MAX_COMPLETED_BUILDS,
  DEFAULT_MAX_FAILED_BUILDS,
  DEFAULT_SECTION_ORDER,
} from "@/shared/constants";

const defaultConfig: ExtensionConfig = {
  organization: "",
  pat: "",
  projects: [],
  activePollingInterval: DEFAULT_ACTIVE_POLL_INTERVAL,
  idlePollingInterval: DEFAULT_IDLE_POLL_INTERVAL,
  prSectionEnabled: true,
  bookmarksEnabled: false,
  bookmarkFolderName: DEFAULT_BOOKMARK_FOLDER,
  showCanceledBuilds: false,
  recentBuildsHours: DEFAULT_RECENT_BUILDS_HOURS,
  maxCompletedBuilds: DEFAULT_MAX_COMPLETED_BUILDS,
  maxFailedBuilds: DEFAULT_MAX_FAILED_BUILDS,
  sectionOrder: DEFAULT_SECTION_ORDER,
  notificationsEnabled: true,
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

describe("Options", () => {
  beforeEach(() => {
    vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);
    vi.mocked(chrome.runtime.sendMessage).mockClear();
    seedStorage({});
  });

  it("renders the settings heading", async () => {
    render(<Options />);
    await waitFor(() => {
      expect(screen.getByText("ADO Companion Settings")).toBeInTheDocument();
    });
  });

  it("renders all sections", async () => {
    render(<Options />);
    await waitFor(() => {
      expect(screen.getByText("Authentication")).toBeInTheDocument();
      expect(screen.getByText("Projects")).toBeInTheDocument();
      expect(screen.getByText("Polling")).toBeInTheDocument();
      expect(screen.getByText("Pipeline Display")).toBeInTheDocument();
      expect(screen.getByText("Section Order")).toBeInTheDocument();
      expect(screen.getAllByText("Pull Requests").length).toBeGreaterThan(0);
    });
  });

  it("renders Save Settings button disabled initially", async () => {
    render(<Options />);
    await waitFor(() => {
      const btn = screen.getByText("Save Settings");
      expect(btn).toBeInTheDocument();
      expect(btn).toBeDisabled();
    });
  });

  it("enables Save button after a change and saves config", async () => {
    render(<Options />);
    await waitFor(() => {
      expect(screen.getByText("Save Settings")).toBeDisabled();
    });

    // Make a change to enable the button
    const orgInput = screen.getByPlaceholderText("e.g. msazure") as HTMLInputElement;
    fireEvent.change(orgInput, { target: { value: "neworg" } });

    await waitFor(() => {
      expect(screen.getByText("Save Settings")).not.toBeDisabled();
      expect(screen.getByText("You have unsaved changes")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Save Settings"));

    await waitFor(() => {
      expect(chrome.storage.local.set).toHaveBeenCalled();
      expect(screen.getByText("Settings saved!")).toBeInTheDocument();
      expect(screen.getByText("Save Settings")).toBeDisabled();
    });
  });

  it("sends CONFIG_UPDATED message on save", async () => {
    render(<Options />);
    await waitFor(() => screen.getByText("Save Settings"));

    // Make a change so save is enabled
    const orgInput = screen.getByPlaceholderText("e.g. msazure") as HTMLInputElement;
    fireEvent.change(orgInput, { target: { value: "changed" } });

    fireEvent.click(screen.getByText("Save Settings"));

    await waitFor(() => {
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: "CONFIG_UPDATED" });
    });
  });

  it("shows PAT expired banner when error state is pat_expired", async () => {
    seedStorage({
      errorState: {
        type: "pat_expired",
        message: "PAT expired",
        timestamp: new Date().toISOString(),
      },
    });
    render(<Options />);
    await waitFor(() => {
      expect(screen.getByText(/Your PAT has expired/)).toBeInTheDocument();
    });
  });

  it("does NOT show PAT expired banner for other error types", async () => {
    seedStorage({
      errorState: {
        type: "network_error",
        message: "timeout",
        timestamp: new Date().toISOString(),
      },
    });
    render(<Options />);
    await waitFor(() => {
      expect(screen.getByText("Save Settings")).toBeInTheDocument();
    });
    expect(screen.queryByText(/Your PAT has expired/)).not.toBeInTheDocument();
  });

  it("loads existing config from storage", async () => {
    seedStorage({
      config: { ...defaultConfig, organization: "existingorg", pat: "existingpat" },
    });
    render(<Options />);
    await waitFor(() => {
      const orgInput = screen.getByPlaceholderText("e.g. msazure") as HTMLInputElement;
      expect(orgInput.value).toBe("existingorg");
    });
  });
});
