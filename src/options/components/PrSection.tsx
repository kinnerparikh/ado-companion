import type { ExtensionConfig } from "@/storage/types";
import { DEFAULT_BOOKMARK_FOLDER } from "@/shared/constants";

interface Props {
  config: ExtensionConfig;
  onChange: (patch: Partial<ExtensionConfig>) => void;
}

export default function PrSection({ config, onChange }: Props) {
  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Pull Requests</h2>

      <label className="flex items-center gap-2 text-sm text-gray-600 mb-3">
        <input
          type="checkbox"
          checked={config.prSectionEnabled}
          onChange={(e) => onChange({ prSectionEnabled: e.target.checked })}
        />
        Show PR section in popover
      </label>

      {config.prSectionEnabled && (
        <>
          <label className="flex items-center gap-2 text-sm text-gray-600 mb-3">
            <input
              type="checkbox"
              checked={config.bookmarksEnabled}
              onChange={(e) => onChange({ bookmarksEnabled: e.target.checked })}
            />
            Manage PRs as bookmarks
          </label>

          {config.bookmarksEnabled && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Bookmark folder name
              </label>
              <input
                type="text"
                value={config.bookmarkFolderName}
                onChange={(e) =>
                  onChange({
                    bookmarkFolderName: e.target.value || DEFAULT_BOOKMARK_FOLDER,
                  })
                }
                placeholder={DEFAULT_BOOKMARK_FOLDER}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}
