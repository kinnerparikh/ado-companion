import { encodePatHeader } from "@/shared/utils";
import * as urls from "./endpoints";
import type {
  AdoConnectionData,
  AdoProjectList,
  AdoBuild,
  AdoBuildList,
  AdoTimeline,
  AdoPullRequestList,
} from "./types";

export class AdoApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "AdoApiError";
  }
}

/**
 * Azure DevOps REST API client.
 */
export class AdoClient {
  private org: string;
  private authHeader: string;

  constructor(org: string, pat: string) {
    this.org = org;
    this.authHeader = encodePatHeader(pat);
  }

  private async request<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: { Authorization: this.authHeader },
    });

    if (!response.ok) {
      throw new AdoApiError(
        `ADO API error: ${response.status} ${response.statusText}`,
        response.status
      );
    }

    // ADO may return 200 with HTML (login page) for invalid/expired PATs
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      throw new AdoApiError(
        "Authentication failed — received non-JSON response (likely invalid PAT)",
        401
      );
    }

    return response.json() as Promise<T>;
  }

  /** Validate PAT and get authenticated user info */
  async getConnectionData(): Promise<AdoConnectionData> {
    return this.request<AdoConnectionData>(urls.connectionDataUrl(this.org));
  }

  /** List all projects in the organization */
  async getProjects(): Promise<AdoProjectList> {
    return this.request<AdoProjectList>(urls.projectsUrl(this.org));
  }

  /** Get running and queued builds for a project, optionally filtered by requester */
  async getRunningBuilds(project: string, requestedForId?: string): Promise<AdoBuildList> {
    return this.request<AdoBuildList>(urls.activeBuildsUrl(this.org, project, requestedForId));
  }

  /** Get recently completed builds (within minFinishTime), optionally filtered by requester */
  async getRecentBuilds(project: string, minFinishTime: string, requestedForId?: string): Promise<AdoBuildList> {
    return this.request<AdoBuildList>(urls.recentBuildsUrl(this.org, project, minFinishTime, requestedForId));
  }

  /** Get a single build by ID */
  async getBuild(project: string, buildId: number): Promise<AdoBuild> {
    return this.request<AdoBuild>(
      urls.singleBuildUrl(this.org, project, buildId)
    );
  }

  /** Get build timeline (tasks/jobs) */
  async getBuildTimeline(project: string, buildId: number): Promise<AdoTimeline> {
    return this.request<AdoTimeline>(
      urls.buildTimelineUrl(this.org, project, buildId)
    );
  }

  /** Get active PRs created by a specific user */
  async getActivePullRequests(
    project: string,
    creatorId: string
  ): Promise<AdoPullRequestList> {
    return this.request<AdoPullRequestList>(
      urls.activePullRequestsUrl(this.org, project, creatorId)
    );
  }
}
