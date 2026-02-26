import { describe, it, expect, beforeAll } from "vitest";
import { AdoClient, AdoApiError } from "@/api/ado-client";
import { getAdoCredentials } from "./env";
import type { AdoConnectionData, AdoProjectList } from "@/api/types";

const creds = getAdoCredentials();
const describeIntegration = creds ? describe : describe.skip;

describeIntegration("ADO API Integration — Connection & Auth", () => {
  let client: AdoClient;

  beforeAll(() => {
    client = new AdoClient(creds!.org, creds!.pat);
  });

  it("should authenticate and return user identity via connectionData", async () => {
    const data: AdoConnectionData = await client.getConnectionData();

    expect(data).toBeDefined();
    expect(data.authenticatedUser).toBeDefined();
    expect(data.authenticatedUser.id).toBeTruthy();
    expect(typeof data.authenticatedUser.id).toBe("string");
    expect(data.authenticatedUser.providerDisplayName).toBeTruthy();
    expect(typeof data.authenticatedUser.providerDisplayName).toBe("string");

    console.log(
      `  ✓ Authenticated as: ${data.authenticatedUser.providerDisplayName} (${data.authenticatedUser.id})`
    );
  });

  it("should reject an invalid PAT with AdoApiError", async () => {
    const badClient = new AdoClient(creds!.org, "invalid-pat-value");

    await expect(badClient.getConnectionData()).rejects.toThrow(AdoApiError);

    try {
      await badClient.getConnectionData();
    } catch (err) {
      expect(err).toBeInstanceOf(AdoApiError);
      // ADO may return 401 directly or 200 with HTML (login page)
      expect((err as AdoApiError).status).toBe(401);
    }
  });

  it("should reject a request to a non-existent organization with an error", async () => {
    const badOrgClient = new AdoClient(
      "this-org-definitely-does-not-exist-12345",
      creds!.pat
    );

    await expect(badOrgClient.getConnectionData()).rejects.toThrow();
  });
});

describeIntegration("ADO API Integration — Projects", () => {
  let client: AdoClient;

  beforeAll(() => {
    client = new AdoClient(creds!.org, creds!.pat);
  });

  it("should list projects in the organization", async () => {
    const data: AdoProjectList = await client.getProjects();

    expect(data).toBeDefined();
    expect(data.value).toBeDefined();
    expect(Array.isArray(data.value)).toBe(true);
    // The org should have at least one project
    expect(data.value.length).toBeGreaterThan(0);

    // Each project should have required fields
    for (const project of data.value) {
      expect(project.id).toBeTruthy();
      expect(project.name).toBeTruthy();
      expect(typeof project.name).toBe("string");
    }

    console.log(
      `  ✓ Found ${data.value.length} project(s): ${data.value
        .slice(0, 5)
        .map((p) => p.name)
        .join(", ")}${data.value.length > 5 ? "..." : ""}`
    );
  });
});

describeIntegration("ADO API Integration — Builds", () => {
  let client: AdoClient;
  let projectName: string;

  beforeAll(async () => {
    client = new AdoClient(creds!.org, creds!.pat);

    // Find first available project to query builds against
    const projects = await client.getProjects();
    expect(projects.value.length).toBeGreaterThan(0);
    projectName = projects.value[0].name;
  });

  it("should fetch running builds (may be empty)", async () => {
    const data = await client.getRunningBuilds(projectName);

    expect(data).toBeDefined();
    expect(data.value).toBeDefined();
    expect(Array.isArray(data.value)).toBe(true);

    // Validate shape of any running builds
    for (const build of data.value) {
      expect(build.id).toBeTruthy();
      expect(build.buildNumber).toBeTruthy();
      expect(build.status).toBe("inProgress");
      expect(build.definition).toBeDefined();
      expect(build.definition.name).toBeTruthy();
      expect(build.project).toBeDefined();
      expect(build.project.name).toBeTruthy();
    }

    console.log(
      `  ✓ Found ${data.value.length} running build(s) in project "${projectName}"`
    );
  });

  it("should fetch build timeline if a running build exists", async () => {
    const builds = await client.getRunningBuilds(projectName);

    if (builds.value.length === 0) {
      console.log("  ⏭ No running builds — skipping timeline test");
      return;
    }

    const build = builds.value[0];
    const timeline = await client.getBuildTimeline(projectName, build.id);

    expect(timeline).toBeDefined();
    expect(timeline.records).toBeDefined();
    expect(Array.isArray(timeline.records)).toBe(true);

    // Validate timeline record shapes
    const jobs = timeline.records.filter((r) => r.type === "Job");
    const tasks = timeline.records.filter((r) => r.type === "Task");

    console.log(
      `  ✓ Build #${build.buildNumber} timeline: ${jobs.length} job(s), ${tasks.length} task(s)`
    );

    for (const record of timeline.records) {
      expect(record.id).toBeTruthy();
      expect(record.type).toBeTruthy();
      expect(record.name).toBeTruthy();
      expect(["pending", "inProgress", "completed"]).toContain(record.state);
    }
  });
});

describeIntegration("ADO API Integration — Pull Requests", () => {
  let client: AdoClient;
  let userId: string;
  let projectName: string;

  beforeAll(async () => {
    client = new AdoClient(creds!.org, creds!.pat);

    // Get user identity
    const connData = await client.getConnectionData();
    userId = connData.authenticatedUser.id;

    // Get first project
    const projects = await client.getProjects();
    expect(projects.value.length).toBeGreaterThan(0);
    projectName = projects.value[0].name;
  });

  it("should fetch active PRs for the authenticated user (may be empty)", async () => {
    const data = await client.getActivePullRequests(projectName, userId);

    expect(data).toBeDefined();
    expect(data.value).toBeDefined();
    expect(Array.isArray(data.value)).toBe(true);

    // Validate shape of any PRs
    for (const pr of data.value) {
      expect(pr.pullRequestId).toBeTruthy();
      expect(pr.title).toBeTruthy();
      expect(pr.status).toBe("active");
      expect(pr.createdBy).toBeDefined();
      expect(pr.createdBy.id).toBe(userId);
      expect(pr.repository).toBeDefined();
      expect(pr.repository.name).toBeTruthy();
      expect(pr.creationDate).toBeTruthy();
    }

    console.log(
      `  ✓ Found ${data.value.length} active PR(s) by user in project "${projectName}"`
    );
  });
});

describeIntegration("ADO API Integration — PAT Header Encoding", () => {
  it("should correctly encode PAT in the Authorization header format", async () => {
    // This test validates the auth header works end-to-end
    // by making a successful authenticated request
    const client = new AdoClient(creds!.org, creds!.pat);
    const data = await client.getConnectionData();

    // If we get here without a 401, the PAT encoding is correct
    expect(data.authenticatedUser).toBeDefined();
  });
});
