import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import PullRequests from "@/popup/components/PullRequests";
import type { CachedPR } from "@/storage/types";

const mockPRs: CachedPR[] = [
  {
    id: 101,
    title: "feat: Add auth",
    projectName: "ProjectA",
    repositoryName: "web-app",
    url: "https://dev.azure.com/org/ProjectA/_git/web-app/pullrequest/101",
    createdDate: "2025-02-25T10:00:00Z",
    lastUpdated: "2025-02-26T10:00:00Z",
    isDraft: false,
    status: "active" as const,
    approvalCount: 0,
    waitingCount: 0,
    rejectionCount: 0,
  },
  {
    id: 102,
    title: "fix: Pipeline timeout",
    projectName: "ProjectB",
    repositoryName: "infra",
    url: "https://dev.azure.com/org/ProjectB/_git/infra/pullrequest/102",
    createdDate: "2025-02-24T10:00:00Z",
    lastUpdated: "2025-02-26T12:00:00Z",
    isDraft: false,
    status: "active" as const,
    approvalCount: 0,
    waitingCount: 0,
    rejectionCount: 0,
  },
];

describe("PullRequests", () => {
  it("renders PR titles and project info", () => {
    render(<PullRequests prs={mockPRs} />);

    expect(screen.getByText("feat: Add auth")).toBeInTheDocument();
    expect(screen.getByText("fix: Pipeline timeout")).toBeInTheDocument();
    expect(screen.getByText("ProjectA / web-app")).toBeInTheDocument();
    expect(screen.getByText("ProjectB / infra")).toBeInTheDocument();
  });

  it("shows empty state when no PRs", () => {
    render(<PullRequests prs={[]} />);
    expect(screen.getByText("No active PRs")).toBeInTheDocument();
  });

  it("renders clickable links", () => {
    render(<PullRequests prs={mockPRs} />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href");
    expect(links[0]).toHaveAttribute("target", "_blank");
  });

  it("sorts PRs oldest first by creation date", () => {
    render(<PullRequests prs={mockPRs} />);

    const items = screen.getAllByRole("link");
    // PR 102 was created earlier (Feb 24) vs PR 101 (Feb 25)
    expect(items[0]).toHaveTextContent("fix: Pipeline timeout");
    expect(items[1]).toHaveTextContent("feat: Add auth");
  });
});
