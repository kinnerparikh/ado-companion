import { describe, it, expect } from "vitest";
import { relativeTime, encodePatHeader } from "@/shared/utils";

describe("relativeTime", () => {
  it("should return seconds for very recent times", () => {
    const now = new Date();
    const result = relativeTime(now);
    expect(result).toBe("0s ago");
  });

  it("should return minutes for times within an hour", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(relativeTime(fiveMinAgo)).toBe("5m ago");
  });

  it("should return hours for times within a day", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(relativeTime(threeHoursAgo)).toBe("3h ago");
  });

  it("should return days for times beyond a day", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(relativeTime(twoDaysAgo)).toBe("2d ago");
  });

  it("should accept ISO string input", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(relativeTime(fiveMinAgo)).toBe("5m ago");
  });

  it("should accept Date object input", () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    expect(relativeTime(tenMinAgo)).toBe("10m ago");
  });

  it("should handle boundary between seconds and minutes (59s)", () => {
    const fiftyNineSec = new Date(Date.now() - 59 * 1000);
    expect(relativeTime(fiftyNineSec)).toBe("59s ago");
  });

  it("should handle boundary at exactly 60 seconds", () => {
    const sixtySeconds = new Date(Date.now() - 60 * 1000);
    expect(relativeTime(sixtySeconds)).toBe("1m ago");
  });
});

describe("encodePatHeader", () => {
  it("should encode PAT as Base64 Basic auth with colon prefix", () => {
    const result = encodePatHeader("my-token");
    expect(result).toBe(`Basic ${btoa(":my-token")}`);
  });

  it("should start with 'Basic '", () => {
    expect(encodePatHeader("anything")).toMatch(/^Basic /);
  });

  it("should produce valid base64 that decodes to :PAT", () => {
    const result = encodePatHeader("test-pat");
    const b64Part = result.replace("Basic ", "");
    const decoded = atob(b64Part);
    expect(decoded).toBe(":test-pat");
  });

  it("should handle special characters in PAT", () => {
    const result = encodePatHeader("abc+/123==xyz");
    const b64Part = result.replace("Basic ", "");
    const decoded = atob(b64Part);
    expect(decoded).toBe(":abc+/123==xyz");
  });
});
