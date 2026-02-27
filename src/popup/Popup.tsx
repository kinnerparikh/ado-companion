import { useState, useEffect } from "react";
import { getStorageMulti, onStorageChange } from "@/storage/chrome-storage";
import type { CachedBuild, CachedPR, ErrorState, ExtensionConfig } from "@/storage/types";
import CollapsibleSection from "./components/CollapsibleSection";
import PullRequests from "./components/PullRequests";
import RunningPipelines from "./components/RunningPipelines";
import StatusBar from "./components/StatusBar";

export default function Popup() {
  const [builds, setBuilds] = useState<CachedBuild[]>([]);
  const [recentBuilds, setRecentBuilds] = useState<CachedBuild[]>([]);
  const [prs, setPrs] = useState<CachedPR[]>([]);
  const [config, setConfig] = useState<ExtensionConfig | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load initial data
    getStorageMulti(["cachedBuilds", "cachedRecentBuilds", "cachedPRs", "config", "lastUpdated", "errorState"]).then(
      (data) => {
        setBuilds(data.cachedBuilds ?? []);
        setRecentBuilds(data.cachedRecentBuilds ?? []);
        setPrs(data.cachedPRs ?? []);
        setConfig(data.config ?? null);
        setLastUpdated(data.lastUpdated ?? null);
        setError(data.errorState ?? null);
        setLoading(false);
      }
    );

    // Request immediate refresh from service worker
    chrome.runtime.sendMessage({ type: "REFRESH_NOW" }).catch(() => {});

    // Listen for storage updates
    const unsubs = [
      onStorageChange("cachedBuilds", (v) => setBuilds(v ?? [])),
      onStorageChange("cachedRecentBuilds", (v) => setRecentBuilds(v ?? [])),
      onStorageChange("cachedPRs", (v) => setPrs(v ?? [])),
      onStorageChange("lastUpdated", (v) => setLastUpdated(v ?? null)),
      onStorageChange("errorState", (v) => setError(v ?? null)),
      onStorageChange("config", (v) => setConfig(v ?? null)),
    ];

    return () => unsubs.forEach((u) => u());
  }, []);

  if (loading) {
    return (
      <div className="w-80 p-4 text-center text-sm text-gray-400">
        Loading…
      </div>
    );
  }

  if (!config?.organization || !config?.pat) {
    return (
      <div className="w-80 p-4 text-center">
        <p className="text-sm text-gray-500 mb-2">Not configured</p>
        <button
          className="text-sm text-blue-500 hover:underline cursor-pointer"
          onClick={() => chrome.runtime.openOptionsPage()}
        >
          Open Settings
        </button>
      </div>
    );
  }

  if (error?.type === "pat_expired" || error?.type === "auth_failed") {
    return (
      <div className="w-80 p-4 text-center">
        <p className="text-sm text-red-500 mb-1">
          {error.type === "pat_expired" ? "PAT expired" : "Authentication failed"}
        </p>
        <p className="text-xs text-gray-400 mb-2">{error.message}</p>
        <button
          className="text-sm text-blue-500 hover:underline cursor-pointer"
          onClick={() => chrome.runtime.openOptionsPage()}
        >
          Update PAT
        </button>
      </div>
    );
  }

  const completedBuilds = recentBuilds.filter((b) => b.result === "succeeded" || b.result === "partiallySucceeded");
  const failedBuilds = recentBuilds.filter((b) => b.result === "failed" || b.result === "canceled");

  return (
    <div className="w-80 max-h-[500px] flex flex-col">
      <div className="flex-1 overflow-y-auto pb-9">
        {config.prSectionEnabled && (
          <CollapsibleSection title="Pull Requests" count={prs.length}>
            <PullRequests prs={prs} />
          </CollapsibleSection>
        )}
        <CollapsibleSection title="Active Pipelines" count={builds.length}>
          <RunningPipelines builds={builds} />
        </CollapsibleSection>
        <CollapsibleSection title="Completed (24h)" count={completedBuilds.length} defaultOpen={false}>
          <RunningPipelines builds={completedBuilds} />
        </CollapsibleSection>
        <CollapsibleSection title="Failed (24h)" count={failedBuilds.length} defaultOpen={false}>
          <RunningPipelines builds={failedBuilds} />
        </CollapsibleSection>
      </div>
      <StatusBar lastUpdated={lastUpdated} error={error} />
    </div>
  );
}
