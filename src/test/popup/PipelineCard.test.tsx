import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PipelineCard from "@/popup/components/PipelineCard";
import type { CachedBuild } from "@/storage/types";

const baseBuild: CachedBuild = {
  id: 5001,
  buildNumber: "20250226.1",
  definitionName: "CI - Web App",
  projectName: "ProjectA",
  status: "inProgress",
  startTime: new Date(Date.now() - 300000).toISOString(),
  queueTime: new Date(Date.now() - 360000).toISOString(),
  url: "https://dev.azure.com/org/ProjectA/_build/results?buildId=5001",
  totalTasks: 12,
  completedTasks: 7,
  jobs: [
    { name: "Build", state: "completed", result: "succeeded", totalTasks: 5, completedTasks: 5 },
    { name: "Test", state: "inProgress", totalTasks: 4, completedTasks: 2 },
    { name: "Deploy", state: "pending", totalTasks: 3, completedTasks: 0 },
  ],
};

describe("PipelineCard", () => {
  it("renders pipeline name as a link", () => {
    render(<PipelineCard build={baseBuild} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", baseBuild.url);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveTextContent("CI - Web App");
  });

  it("shows project name", () => {
    render(<PipelineCard build={baseBuild} />);
    expect(screen.getByText(/ProjectA/)).toBeInTheDocument();
  });

  it("shows task progress count", () => {
    render(<PipelineCard build={baseBuild} />);
    expect(screen.getByText("7 / 12 tasks")).toBeInTheDocument();
  });

  it("shows percentage", () => {
    render(<PipelineCard build={baseBuild} />);
    expect(screen.getByText("58%")).toBeInTheDocument();
  });

  it("shows 0% when no tasks", () => {
    const emptyBuild = { ...baseBuild, totalTasks: 0, completedTasks: 0, jobs: [] };
    render(<PipelineCard build={emptyBuild} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("shows 'Running' status for in-progress builds", () => {
    render(<PipelineCard build={baseBuild} />);
    expect(screen.getByText("Running")).toBeInTheDocument();
  });

  it("shows result status for non-running builds", () => {
    const failedBuild: CachedBuild = {
      ...baseBuild,
      status: "completed",
      result: "failed",
    };
    render(<PipelineCard build={failedBuild} />);
    expect(screen.getByText("failed")).toBeInTheDocument();
  });

  it("shows job count button when jobs exist", () => {
    render(<PipelineCard build={baseBuild} />);
    expect(screen.getByText(/3 jobs/)).toBeInTheDocument();
  });

  it("hides job count button when no jobs", () => {
    const noJobsBuild = { ...baseBuild, jobs: [] };
    render(<PipelineCard build={noJobsBuild} />);
    expect(screen.queryByText(/job/)).not.toBeInTheDocument();
  });

  it("does not show job details by default", () => {
    render(<PipelineCard build={baseBuild} />);
    expect(screen.queryByText("Build")).not.toBeInTheDocument();
    expect(screen.queryByText("Test")).not.toBeInTheDocument();
    expect(screen.queryByText("Deploy")).not.toBeInTheDocument();
  });

  it("expands to show job details when clicked", () => {
    render(<PipelineCard build={baseBuild} />);
    fireEvent.click(screen.getByText(/3 jobs/));

    expect(screen.getByText("Build")).toBeInTheDocument();
    expect(screen.getByText("Test")).toBeInTheDocument();
    expect(screen.getByText("Deploy")).toBeInTheDocument();
  });

  it("shows per-job task counts when expanded", () => {
    render(<PipelineCard build={baseBuild} />);
    fireEvent.click(screen.getByText(/3 jobs/));

    expect(screen.getByText("5/5")).toBeInTheDocument();
    expect(screen.getByText("2/4")).toBeInTheDocument();
    expect(screen.getByText("0/3")).toBeInTheDocument();
  });

  it("collapses job details on second click", () => {
    render(<PipelineCard build={baseBuild} />);
    const toggle = screen.getByText(/3 jobs/);

    fireEvent.click(toggle);
    expect(screen.getByText("Build")).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.queryByText("Build")).not.toBeInTheDocument();
  });

  it("shows singular 'job' for single job", () => {
    const singleJob = { ...baseBuild, jobs: [baseBuild.jobs[0]] };
    render(<PipelineCard build={singleJob} />);
    expect(screen.getByText(/1 job$/)).toBeInTheDocument();
  });
});
