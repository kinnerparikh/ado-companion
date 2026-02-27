import { relativeTime } from "@/shared/utils";
import type { ErrorState } from "@/storage/types";

interface Props {
  lastUpdated: string | null;
  error: ErrorState | null;
}

export default function StatusBar({ lastUpdated, error }: Props) {
  return (
    <div className="absolute bottom-0 left-0 right-0 px-3 py-1.5 bg-gray-50 border-t border-gray-200 flex justify-between items-center text-xs text-gray-400">
      <span>
        {lastUpdated ? `Updated ${relativeTime(lastUpdated)}` : "Never updated"}
      </span>
      <div className="flex items-center gap-2">
        {error?.type === "network_error" && (
          <span className="text-yellow-500" title={error.message}>
            ⚠ Refresh failed
          </span>
        )}
        <button
          onClick={() => chrome.runtime.sendMessage({ type: "REFRESH_NOW" }).catch(() => {})}
          className="text-gray-500 hover:text-gray-700 cursor-pointer"
          title="Refresh"
        >
          🔄
        </button>
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          className="text-gray-500 hover:text-gray-700 cursor-pointer"
          title="Settings"
        >
          ⚙️
        </button>
      </div>
    </div>
  );
}
