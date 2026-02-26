import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RunningPipelines from "@/popup/components/RunningPipelines";
import type { CachedBuild } from "@/storage/types";

const mockBuilds: CachedBuild[] = [
  {
    id: 5001,
    buildNumber: "20250226.1",
    definitionName: "CI - Web App",
    projectName: "ProjectA",
    status: "inProgress",
    startTime: "2025-02-26T22:50:00Z",
    queueTime: "2025-02-26T22:49:00Z",
    url: "https://dev.azure.com/org/ProjectA/_build/results?buildId=5001",
    totalTasks: 12,
    completedTasks: 7,
    jobs: [
      { name: "Build", state: "completed", result: "succeeded", totalTasks: 5, completedTasks: 5 },
      { name: "Test", state: "inProgress", totalTasks: 4, completedTasks: 2 },
    ],
  },
  {
    id: 5002,
    buildNumber: "20250226.2",
    definitionName: "Release Pipeline",
    projectName: "ProjectB",
    status: "inProgress",
    startTime: "2025-02-26T22:55:00Z",
    queueTime: "2025-02-26T22:54:00Z",
    url: "https://dev.azure.com/org/ProjectB/_build/results?buildId=5002",
    totalTasks: 8,
    completedTasks: 2,
    jobs: [],
  },
];

describe("RunningPipelines", () => {
  it("renders pipeline names", () => {
    render(<RunningPipelines builds={mockBuilds} />);

    expect(screen.getByText("CI - Web App")).toBeInTheDocument();
    expect(screen.getByText("Release Pipeline")).toBeInTheDocument();
  });

  it("shows empty state when no builds", () => {
    render(<RunningPipelines builds={[]} />);
    expect(screen.getByText("No running pipelines")).toBeInTheDocument();
  });

  it("shows task progress", () => {
    render(<RunningPipelines builds={mockBuilds} />);

    expect(screen.getByText("7 / 12 tasks")).toBeInTheDocument();
    expect(screen.getByText("2 / 8 tasks")).toBeInTheDocument();
  });

  it("sorts by queue time (most recent first)", () => {
    render(<RunningPipelines builds={mockBuilds} />);

    const links = screen.getAllByRole("link");
    // Build 5002 was queued later
    expect(links[0]).toHaveTextContent("Release Pipeline");
    expect(links[1]).toHaveTextContent("CI - Web App");
  });
});
