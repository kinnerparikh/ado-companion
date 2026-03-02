import { describe, it, expect } from "vitest";
import { batchBuildsUrl } from "@/api/endpoints";

describe("batchBuildsUrl", () => {
  it("should include comma-separated buildIds in URL", () => {
    const url = batchBuildsUrl("myorg", "ProjectA", [100, 200, 300]);

    expect(url).toBe(
      "https://dev.azure.com/myorg/ProjectA/_apis/build/builds?buildIds=100,200,300&api-version=7.1"
    );
  });

  it("should handle a single buildId", () => {
    const url = batchBuildsUrl("myorg", "ProjectA", [42]);

    expect(url).toContain("buildIds=42");
  });

  it("should encode project names with special characters", () => {
    const url = batchBuildsUrl("myorg", "My Project", [1, 2]);

    expect(url).toContain("My%20Project");
    expect(url).toContain("buildIds=1,2");
  });
});
