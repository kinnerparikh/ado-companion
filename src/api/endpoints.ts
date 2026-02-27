import { ADO_API_VERSION } from "@/shared/constants";

/**
 * Build ADO API endpoint URLs.
 */
export function connectionDataUrl(org: string): string {
  return `https://dev.azure.com/${org}/_apis/connectionData`;
}

export function projectsUrl(org: string): string {
  return `https://dev.azure.com/${org}/_apis/projects?api-version=${ADO_API_VERSION}&$top=200`;
}

export function activeBuildsUrl(org: string, project: string, requestedForId?: string): string {
  let url = `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_apis/build/builds?statusFilter=inProgress,notStarted&api-version=${ADO_API_VERSION}`;
  if (requestedForId) {
    url += `&requestedFor=${requestedForId}`;
  }
  return url;
}

export function recentBuildsUrl(org: string, project: string, minFinishTime: string, requestedForId?: string): string {
  let url = `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_apis/build/builds?statusFilter=completed&minFinishTime=${encodeURIComponent(minFinishTime)}&api-version=${ADO_API_VERSION}`;
  if (requestedForId) {
    url += `&requestedFor=${requestedForId}`;
  }
  return url;
}

export function buildTimelineUrl(org: string, project: string, buildId: number): string {
  return `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_apis/build/builds/${buildId}/timeline?api-version=${ADO_API_VERSION}`;
}

export function singleBuildUrl(org: string, project: string, buildId: number): string {
  return `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_apis/build/builds/${buildId}?api-version=${ADO_API_VERSION}`;
}

export function activePullRequestsUrl(org: string, project: string, creatorId: string): string {
  return `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_apis/git/pullrequests?searchCriteria.creatorId=${creatorId}&searchCriteria.status=active&api-version=${ADO_API_VERSION}`;
}

export function buildWebUrl(org: string, project: string, buildId: number): string {
  return `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_build/results?buildId=${buildId}`;
}

export function prWebUrl(org: string, project: string, repoName: string, prId: number): string {
  return `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_git/${encodeURIComponent(repoName)}/pullrequest/${prId}`;
}
