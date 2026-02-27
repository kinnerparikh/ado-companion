import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PrSection from "@/options/components/PrSection";
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
  pat: "pat",
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

describe("PrSection", () => {
  it("renders heading", () => {
    render(<PrSection config={baseConfig} onChange={vi.fn()} />);
    expect(screen.getByText("Pull Requests")).toBeInTheDocument();
  });

  it("renders PR section toggle checkbox", () => {
    render(<PrSection config={baseConfig} onChange={vi.fn()} />);
    expect(screen.getByText("Show PR section in popover")).toBeInTheDocument();
  });

  it("calls onChange when PR toggle is clicked", () => {
    const onChange = vi.fn();
    render(<PrSection config={baseConfig} onChange={onChange} />);

    fireEvent.click(screen.getByText("Show PR section in popover"));
    expect(onChange).toHaveBeenCalledWith({ prSectionEnabled: false });
  });

  it("shows bookmark option when PR section is enabled", () => {
    render(<PrSection config={baseConfig} onChange={vi.fn()} />);
    expect(screen.getByText("Manage PRs as bookmarks")).toBeInTheDocument();
  });

  it("hides bookmark option when PR section is disabled", () => {
    const config = { ...baseConfig, prSectionEnabled: false };
    render(<PrSection config={config} onChange={vi.fn()} />);
    expect(screen.queryByText("Manage PRs as bookmarks")).not.toBeInTheDocument();
  });

  it("calls onChange when bookmark toggle is clicked", () => {
    const onChange = vi.fn();
    render(<PrSection config={baseConfig} onChange={onChange} />);

    fireEvent.click(screen.getByText("Manage PRs as bookmarks"));
    expect(onChange).toHaveBeenCalledWith({ bookmarksEnabled: true });
  });

  it("shows folder name input when bookmarks are enabled", () => {
    const config = { ...baseConfig, bookmarksEnabled: true };
    render(<PrSection config={config} onChange={vi.fn()} />);
    expect(screen.getByText("Bookmark folder name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(DEFAULT_BOOKMARK_FOLDER)).toBeInTheDocument();
  });

  it("hides folder name input when bookmarks are disabled", () => {
    render(<PrSection config={baseConfig} onChange={vi.fn()} />);
    expect(screen.queryByText("Bookmark folder name")).not.toBeInTheDocument();
  });

  it("calls onChange with folder name", () => {
    const onChange = vi.fn();
    const config = { ...baseConfig, bookmarksEnabled: true };
    render(<PrSection config={config} onChange={onChange} />);

    fireEvent.change(screen.getByPlaceholderText(DEFAULT_BOOKMARK_FOLDER), {
      target: { value: "My PRs" },
    });
    expect(onChange).toHaveBeenCalledWith({ bookmarkFolderName: "My PRs" });
  });

  it("defaults to DEFAULT_BOOKMARK_FOLDER when input is cleared", () => {
    const onChange = vi.fn();
    const config = { ...baseConfig, bookmarksEnabled: true };
    render(<PrSection config={config} onChange={onChange} />);

    fireEvent.change(screen.getByPlaceholderText(DEFAULT_BOOKMARK_FOLDER), {
      target: { value: "" },
    });
    expect(onChange).toHaveBeenCalledWith({ bookmarkFolderName: DEFAULT_BOOKMARK_FOLDER });
  });
});
