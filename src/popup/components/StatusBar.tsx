import { relativeTime } from "@/shared/utils";
import type { ErrorState } from "@/storage/types";

interface Props {
  lastUpdated: string | null;
  error: ErrorState | null;
}

export default function StatusBar({ lastUpdated, error }: Props) {
  return (
    <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-200 flex justify-between items-center text-xs text-gray-400">
      <span>
        {lastUpdated ? `Updated ${relativeTime(lastUpdated)}` : "Never updated"}
      </span>
      {error?.type === "network_error" && (
        <span className="text-yellow-500" title={error.message}>
          ⚠ Refresh failed
        </span>
      )}
    </div>
  );
}
