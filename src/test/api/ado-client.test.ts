import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdoClient, AdoApiError } from "@/api/ado-client";

describe("AdoClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should encode PAT and make authenticated requests", async () => {
    const mockResponse = {
      authenticatedUser: {
        id: "user-123",
        providerDisplayName: "Test User",
        properties: { Account: { $value: "test@user.com" } },
      },
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const client = new AdoClient("myorg", "my-pat-token");
    const data = await client.getConnectionData();

    expect(data.authenticatedUser.id).toBe("user-123");
    expect(fetch).toHaveBeenCalledWith(
      "https://dev.azure.com/myorg/_apis/connectionData",
      { headers: { Authorization: `Basic ${btoa(":my-pat-token")}` } }
    );
  });

  it("should throw AdoApiError on non-OK response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    } as Response);

    const client = new AdoClient("myorg", "bad-pat");

    await expect(client.getConnectionData()).rejects.toThrow(AdoApiError);
    await expect(client.getConnectionData()).rejects.toMatchObject({
      status: 401,
    });
  });

  it("should fetch running builds for a project", async () => {
    const mockBuilds = {
      count: 1,
      value: [{ id: 1, buildNumber: "20250226.1", status: "inProgress" }],
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockBuilds),
    } as Response);

    const client = new AdoClient("myorg", "pat");
    const result = await client.getRunningBuilds("ProjectA");

    expect(result.value).toHaveLength(1);
    expect(result.value[0].status).toBe("inProgress");
  });

  it("should fetch active PRs for a user", async () => {
    const mockPRs = {
      count: 2,
      value: [
        { pullRequestId: 101, title: "PR 1", status: "active" },
        { pullRequestId: 102, title: "PR 2", status: "active" },
      ],
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPRs),
    } as Response);

    const client = new AdoClient("myorg", "pat");
    const result = await client.getActivePullRequests("ProjectA", "user-123");

    expect(result.value).toHaveLength(2);
  });
});
