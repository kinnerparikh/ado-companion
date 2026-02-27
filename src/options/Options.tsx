import { useState, useEffect } from "react";
import { getStorage, setStorage } from "@/storage/chrome-storage";
import type { ExtensionConfig, ErrorState } from "@/storage/types";
import {
  DEFAULT_ACTIVE_POLL_INTERVAL,
  DEFAULT_IDLE_POLL_INTERVAL,
  DEFAULT_BOOKMARK_FOLDER,
  DEFAULT_RECENT_BUILDS_HOURS,
  DEFAULT_MAX_COMPLETED_BUILDS,
  DEFAULT_MAX_FAILED_BUILDS,
  DEFAULT_SECTION_ORDER,
} from "@/shared/constants";
import AuthSection from "./components/AuthSection";
import ProjectSection from "./components/ProjectSection";
import PollingSection from "./components/PollingSection";
import PipelineDisplaySection from "./components/PipelineDisplaySection";
import SectionOrderSection from "./components/SectionOrderSection";
import PrSection from "./components/PrSection";

const defaultConfig: ExtensionConfig = {
  organization: "",
  pat: "",
  projects: [],
  activePollingInterval: DEFAULT_ACTIVE_POLL_INTERVAL,
  idlePollingInterval: DEFAULT_IDLE_POLL_INTERVAL,
  prSectionEnabled: true,
  bookmarksEnabled: false,
  bookmarkFolderName: DEFAULT_BOOKMARK_FOLDER,
  showCanceledBuilds: false,
  recentBuildsHours: DEFAULT_RECENT_BUILDS_HOURS,
  maxCompletedBuilds: DEFAULT_MAX_COMPLETED_BUILDS,
  maxFailedBuilds: DEFAULT_MAX_FAILED_BUILDS,
  sectionOrder: DEFAULT_SECTION_ORDER,
  notificationsEnabled: true,
};

export default function Options() {
  const [config, setConfig] = useState<ExtensionConfig>(defaultConfig);
  const [error, setError] = useState<ErrorState | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([getStorage("config"), getStorage("errorState")]).then(
      ([c, e]) => {
        if (c) setConfig(c);
        setError(e ?? null);
      }
    );
  }, []);

  const updateConfig = (patch: Partial<ExtensionConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };

  const handleSave = async () => {
    await setStorage("config", config);
    setSaved(true);
    // Notify service worker to re-init
    chrome.runtime.sendMessage({ type: "CONFIG_UPDATED" }).catch(() => {});
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-6">ADO Companion Settings</h1>

      {error?.type === "pat_expired" && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          Your PAT has expired. Please update it below.
        </div>
      )}

      <AuthSection config={config} onChange={updateConfig} />
      <ProjectSection config={config} onChange={updateConfig} />
      <PollingSection config={config} onChange={updateConfig} />
      <PipelineDisplaySection config={config} onChange={updateConfig} />
      <SectionOrderSection config={config} onChange={updateConfig} />
      <PrSection config={config} onChange={updateConfig} />

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 cursor-pointer"
        >
          Save Settings
        </button>
        {saved && (
          <span className="text-sm text-green-600">Settings saved!</span>
        )}
      </div>
    </div>
  );
}
