import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AuthSection from "@/options/components/AuthSection";
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

const baseConfig: ExtensionConfig = {
  organization: "myorg",
  pat: "my-pat",
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

const emptyPatConfig: ExtensionConfig = { ...baseConfig, pat: "" };

describe("AuthSection", () => {
  it("renders organization input and signed-in indicator when PAT exists", () => {
    render(<AuthSection config={baseConfig} onChange={vi.fn()} />);

    expect(screen.getByPlaceholderText("e.g. msazure")).toBeInTheDocument();
    expect(screen.getByText(/Already signed in/)).toBeInTheDocument();
  });

  it("renders PAT input and Log In button when no PAT", () => {
    render(<AuthSection config={emptyPatConfig} onChange={vi.fn()} />);

    expect(screen.getByPlaceholderText("Paste your PAT")).toBeInTheDocument();
    expect(screen.getByText("Log In")).toBeInTheDocument();
    expect(screen.queryByText("Test Connection")).not.toBeInTheDocument();
    expect(screen.queryByText("Log Out")).not.toBeInTheDocument();
  });

  it("Log In button is disabled when PAT draft is empty", () => {
    render(<AuthSection config={emptyPatConfig} onChange={vi.fn()} />);
    expect(screen.getByText("Log In")).toBeDisabled();
  });

  it("Log In validates PAT and calls onChange on success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      headers: { get: () => "application/json" },
      json: () =>
        Promise.resolve({
          authenticatedUser: {
            id: "user-123",
            providerDisplayName: "Test User",
          },
        }),
    } as unknown as Response);

    const onChange = vi.fn();
    render(<AuthSection config={emptyPatConfig} onChange={onChange} />);

    fireEvent.change(screen.getByPlaceholderText("Paste your PAT"), {
      target: { value: "my-new-pat" },
    });
    fireEvent.click(screen.getByText("Log In"));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({ pat: "my-new-pat" });
      expect(screen.getByText("Connected as Test User")).toBeInTheDocument();
    });
  });

  it("Log In shows error on invalid PAT", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    } as Response);

    render(<AuthSection config={emptyPatConfig} onChange={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("Paste your PAT"), {
      target: { value: "bad-pat" },
    });
    fireEvent.click(screen.getByText("Log In"));

    await waitFor(() => {
      expect(screen.getByText("Invalid or expired PAT.")).toBeInTheDocument();
    });
  });

  it("renders Test Connection and Log Out when signed in", () => {
    render(<AuthSection config={baseConfig} onChange={vi.fn()} />);
    expect(screen.getByText("Test Connection")).toBeInTheDocument();
    expect(screen.getByText("Log Out")).toBeInTheDocument();
  });

  it("calls onChange to clear PAT and org on logout", async () => {
    const onChange = vi.fn();
    render(<AuthSection config={baseConfig} onChange={onChange} />);

    fireEvent.click(screen.getByText("Log Out"));
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({ pat: "", organization: "" });
    });
  });

  it("calls onChange when organization input changes", () => {
    const onChange = vi.fn();
    render(<AuthSection config={baseConfig} onChange={onChange} />);

    fireEvent.change(screen.getByPlaceholderText("e.g. msazure"), {
      target: { value: "neworg" },
    });
    expect(onChange).toHaveBeenCalledWith({ organization: "neworg" });
  });

  it("PAT input has type=password", () => {
    render(<AuthSection config={emptyPatConfig} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("Paste your PAT")).toHaveAttribute("type", "password");
  });

  it("shows success message on successful connection test", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      headers: { get: () => "application/json" },
      json: () =>
        Promise.resolve({
          authenticatedUser: {
            id: "user-123",
            providerDisplayName: "Test User",
          },
        }),
    } as unknown as Response);

    render(<AuthSection config={baseConfig} onChange={vi.fn()} />);
    fireEvent.click(screen.getByText("Test Connection"));

    await waitFor(() => {
      expect(screen.getByText("Connected as Test User")).toBeInTheDocument();
    });
  });

  it("shows error message on failed connection test", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    } as Response);

    render(<AuthSection config={baseConfig} onChange={vi.fn()} />);
    fireEvent.click(screen.getByText("Test Connection"));

    await waitFor(() => {
      expect(screen.getByText("Invalid or expired PAT.")).toBeInTheDocument();
    });
  });

  it("disables button while testing", async () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    render(<AuthSection config={baseConfig} onChange={vi.fn()} />);
    fireEvent.click(screen.getByText("Test Connection"));

    expect(screen.getByText("Testing…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Testing…" })).toBeDisabled();
  });
});
