import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProjectSection from "@/options/components/ProjectSection";
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
};

describe("ProjectSection", () => {
  it("renders heading and input", () => {
    render(<ProjectSection config={baseConfig} onChange={vi.fn()} />);
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Project name or *")).toBeInTheDocument();
  });

  it("adds a project when Add is clicked", () => {
    const onChange = vi.fn();
    render(<ProjectSection config={baseConfig} onChange={onChange} />);

    fireEvent.change(screen.getByPlaceholderText("Project name or *"), {
      target: { value: "MyProject" },
    });
    fireEvent.click(screen.getByText("Add"));

    expect(onChange).toHaveBeenCalledWith({ projects: ["MyProject"] });
  });

  it("adds a project on Enter key", () => {
    const onChange = vi.fn();
    render(<ProjectSection config={baseConfig} onChange={onChange} />);

    const input = screen.getByPlaceholderText("Project name or *");
    fireEvent.change(input, { target: { value: "MyProject" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith({ projects: ["MyProject"] });
  });

  it("strips org prefix from org/project format", () => {
    const onChange = vi.fn();
    render(<ProjectSection config={baseConfig} onChange={onChange} />);

    fireEvent.change(screen.getByPlaceholderText("Project name or *"), {
      target: { value: "myorg/SomeProject" },
    });
    fireEvent.click(screen.getByText("Add"));

    expect(onChange).toHaveBeenCalledWith({ projects: ["SomeProject"] });
  });

  it("adds wildcard *", () => {
    const onChange = vi.fn();
    render(<ProjectSection config={baseConfig} onChange={onChange} />);

    fireEvent.change(screen.getByPlaceholderText("Project name or *"), {
      target: { value: "*" },
    });
    fireEvent.click(screen.getByText("Add"));

    expect(onChange).toHaveBeenCalledWith({ projects: ["*"] });
  });

  it("does not add duplicates", () => {
    const onChange = vi.fn();
    const configWithProject = { ...baseConfig, projects: ["ExistingProject"] };
    render(<ProjectSection config={configWithProject} onChange={onChange} />);

    fireEvent.change(screen.getByPlaceholderText("Project name or *"), {
      target: { value: "ExistingProject" },
    });
    fireEvent.click(screen.getByText("Add"));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not add empty string", () => {
    const onChange = vi.fn();
    render(<ProjectSection config={baseConfig} onChange={onChange} />);

    fireEvent.click(screen.getByText("Add"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders existing projects with org prefix", () => {
    const configWithProjects = { ...baseConfig, projects: ["ProjectA", "ProjectB"] };
    render(<ProjectSection config={configWithProjects} onChange={vi.fn()} />);

    expect(screen.getByText("myorg/ProjectA")).toBeInTheDocument();
    expect(screen.getByText("myorg/ProjectB")).toBeInTheDocument();
  });

  it("removes a project when Remove is clicked", () => {
    const onChange = vi.fn();
    const configWithProjects = { ...baseConfig, projects: ["ProjectA", "ProjectB"] };
    render(<ProjectSection config={configWithProjects} onChange={onChange} />);

    const removeButtons = screen.getAllByText("Remove");
    fireEvent.click(removeButtons[0]);

    expect(onChange).toHaveBeenCalledWith({ projects: ["ProjectB"] });
  });

  it("clears input after adding", () => {
    render(<ProjectSection config={baseConfig} onChange={vi.fn()} />);
    const input = screen.getByPlaceholderText("Project name or *") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "NewProject" } });
    fireEvent.click(screen.getByText("Add"));

    expect(input.value).toBe("");
  });
});
