/** Raw ADO API response types */

export interface AdoConnectionData {
  authenticatedUser: {
    id: string;
    descriptor: string;
    subjectDescriptor: string;
    providerDisplayName: string;
    customDisplayName?: string;
    isActive: boolean;
    properties: {
      Account?: { $value: string };
    };
  };
  authorizedUser: {
    id: string;
    descriptor: string;
    subjectDescriptor: string;
    providerDisplayName: string;
    customDisplayName?: string;
  };
}

export interface AdoProject {
  id: string;
  name: string;
  state: string;
  url: string;
}

export interface AdoProjectList {
  count: number;
  value: AdoProject[];
}

export interface AdoBuild {
  id: number;
  buildNumber: string;
  status: "all" | "cancelling" | "completed" | "inProgress" | "none" | "notStarted" | "postponed";
  result?: "canceled" | "failed" | "none" | "partiallySucceeded" | "succeeded";
  queueTime: string;
  startTime?: string;
  finishTime?: string;
  definition: {
    id: number;
    name: string;
  };
  project: {
    id: string;
    name: string;
  };
  requestedFor: {
    id: string;
    displayName: string;
    uniqueName: string;
  };
  requestedBy: {
    id: string;
    displayName: string;
    uniqueName: string;
  };
  triggerInfo?: Record<string, string>;
  sourceBranch: string;
  _links: {
    web: { href: string };
  };
}

export interface AdoBuildList {
  count: number;
  value: AdoBuild[];
}

export interface AdoTimelineRecord {
  id: string;
  parentId?: string;
  type: string; // "Stage", "Phase", "Job", "Task"
  name: string;
  state: "pending" | "inProgress" | "completed";
  result?: "abandoned" | "canceled" | "failed" | "skipped" | "succeeded" | "succeededWithIssues";
  order: number;
}

export interface AdoTimeline {
  records: AdoTimelineRecord[];
}

export interface AdoPullRequest {
  pullRequestId: number;
  title: string;
  status: "abandoned" | "active" | "completed" | "all";
  isDraft: boolean;
  mergeStatus?: "conflicts" | "failure" | "notSet" | "queued" | "rejectedByPolicy" | "succeeded";
  reviewers?: Array<{
    id: string;
    displayName: string;
    vote: number; // -10=rejected, -5=waiting, 0=none, 5=approved_suggestions, 10=approved
  }>;
  createdBy: {
    id: string;
    displayName: string;
    uniqueName: string;
  };
  creationDate: string;
  closedDate?: string;
  repository: {
    id: string;
    name: string;
    project: {
      id: string;
      name: string;
    };
  };
  url: string;
  _links?: {
    web?: { href: string };
  };
}

export interface AdoPullRequestList {
  count: number;
  value: AdoPullRequest[];
}
