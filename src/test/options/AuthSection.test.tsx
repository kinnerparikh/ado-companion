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
};

describe("AuthSection", () => {
  it("renders organization and PAT inputs", () => {
    const onChange = vi.fn();
    render(<AuthSection config={baseConfig} onChange={onChange} />);

    expect(screen.getByPlaceholderText("e.g. msazure")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Paste your PAT")).toBeInTheDocument();
  });

  it("renders Test Connection button", () => {
    render(<AuthSection config={baseConfig} onChange={vi.fn()} />);
    expect(screen.getByText("Test Connection")).toBeInTheDocument();
  });

  it("calls onChange when organization input changes", () => {
    const onChange = vi.fn();
    render(<AuthSection config={baseConfig} onChange={onChange} />);

    fireEvent.change(screen.getByPlaceholderText("e.g. msazure"), {
      target: { value: "neworg" },
    });
    expect(onChange).toHaveBeenCalledWith({ organization: "neworg" });
  });

  it("calls onChange when PAT input changes", () => {
    const onChange = vi.fn();
    render(<AuthSection config={baseConfig} onChange={onChange} />);

    fireEvent.change(screen.getByPlaceholderText("Paste your PAT"), {
      target: { value: "new-pat" },
    });
    expect(onChange).toHaveBeenCalledWith({ pat: "new-pat" });
  });

  it("shows error when testing connection without org/pat", async () => {
    const emptyConfig = { ...baseConfig, organization: "", pat: "" };
    render(<AuthSection config={emptyConfig} onChange={vi.fn()} />);

    fireEvent.click(screen.getByText("Test Connection"));

    await waitFor(() => {
      expect(screen.getByText("Organization and PAT are required.")).toBeInTheDocument();
    });
  });

  it("shows success message on successful connection test", async () => {
    // Mock fetch for connection test
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
    // Never-resolving fetch to keep testing state
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    render(<AuthSection config={baseConfig} onChange={vi.fn()} />);
    fireEvent.click(screen.getByText("Test Connection"));

    expect(screen.getByText("Testing…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Testing…" })).toBeDisabled();
  });

  it("PAT input has type=password", () => {
    render(<AuthSection config={baseConfig} onChange={vi.fn()} />);
    const patInput = screen.getByPlaceholderText("Paste your PAT");
    expect(patInput).toHaveAttribute("type", "password");
  });
});
