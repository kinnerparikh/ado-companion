import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StatusBar from "@/popup/components/StatusBar";
import type { ErrorState } from "@/storage/types";

describe("StatusBar", () => {
  it("shows 'Never updated' when lastUpdated is null", () => {
    render(<StatusBar lastUpdated={null} error={null} />);
    expect(screen.getByText("Never updated")).toBeInTheDocument();
  });

  it("shows relative time when lastUpdated is set", () => {
    const recent = new Date(Date.now() - 60000).toISOString(); // 1 min ago
    render(<StatusBar lastUpdated={recent} error={null} />);
    expect(screen.getByText(/Updated 1m ago/)).toBeInTheDocument();
  });

  it("shows refresh failed indicator for network errors", () => {
    const error: ErrorState = {
      type: "network_error",
      message: "Connection timed out",
      timestamp: new Date().toISOString(),
    };
    render(<StatusBar lastUpdated={new Date().toISOString()} error={error} />);
    expect(screen.getByText("⚠ Refresh failed")).toBeInTheDocument();
  });

  it("does NOT show refresh failed for auth errors", () => {
    const error: ErrorState = {
      type: "pat_expired",
      message: "PAT expired",
      timestamp: new Date().toISOString(),
    };
    render(<StatusBar lastUpdated={new Date().toISOString()} error={error} />);
    expect(screen.queryByText("⚠ Refresh failed")).not.toBeInTheDocument();
  });

  it("does NOT show refresh failed when no error", () => {
    render(<StatusBar lastUpdated={new Date().toISOString()} error={null} />);
    expect(screen.queryByText("⚠ Refresh failed")).not.toBeInTheDocument();
  });

  it("shows error message as tooltip", () => {
    const error: ErrorState = {
      type: "network_error",
      message: "Connection timed out",
      timestamp: new Date().toISOString(),
    };
    render(<StatusBar lastUpdated={null} error={error} />);
    expect(screen.getByTitle("Connection timed out")).toBeInTheDocument();
  });
});
