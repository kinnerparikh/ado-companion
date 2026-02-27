import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PollingSection from "@/options/components/PollingSection";
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
};

describe("PollingSection", () => {
  it("renders heading", () => {
    render(<PollingSection config={baseConfig} onChange={vi.fn()} />);
    expect(screen.getByText("Polling")).toBeInTheDocument();
  });

  it("shows current active interval value", () => {
    render(<PollingSection config={baseConfig} onChange={vi.fn()} />);
    expect(screen.getByText(/Active interval.*30s/)).toBeInTheDocument();
  });

  it("shows current idle interval value", () => {
    render(<PollingSection config={baseConfig} onChange={vi.fn()} />);
    expect(screen.getByText(/Idle interval.*120s/)).toBeInTheDocument();
  });

  it("calls onChange when active interval slider changes", () => {
    const onChange = vi.fn();
    render(<PollingSection config={baseConfig} onChange={onChange} />);

    const sliders = screen.getAllByRole("slider");
    fireEvent.change(sliders[0], { target: { value: "60" } });

    expect(onChange).toHaveBeenCalledWith({ activePollingInterval: 60 });
  });

  it("calls onChange when idle interval slider changes", () => {
    const onChange = vi.fn();
    render(<PollingSection config={baseConfig} onChange={onChange} />);

    const sliders = screen.getAllByRole("slider");
    fireEvent.change(sliders[1], { target: { value: "300" } });

    expect(onChange).toHaveBeenCalledWith({ idlePollingInterval: 300 });
  });

  it("renders two range sliders", () => {
    render(<PollingSection config={baseConfig} onChange={vi.fn()} />);
    const sliders = screen.getAllByRole("slider");
    expect(sliders).toHaveLength(2);
  });
});
