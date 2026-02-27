import type { ExtensionConfig } from "@/storage/types";

interface Props {
  config: ExtensionConfig;
  onChange: (patch: Partial<ExtensionConfig>) => void;
}

export default function PipelineDisplaySection({ config, onChange }: Props) {
  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Pipeline Display</h2>

      <label className="flex items-center gap-2 mb-3">
        <input
          type="checkbox"
          checked={config.showCanceledBuilds ?? false}
          onChange={(e) => onChange({ showCanceledBuilds: e.target.checked })}
          className="rounded"
        />
        <span className="text-sm text-gray-600">Show canceled builds in Failed section</span>
      </label>

      <div className="mb-3">
        <label className="block text-sm text-gray-600 mb-1">
          Recent builds time window: <strong>{config.recentBuildsHours ?? 48}h</strong>
        </label>
        <input
          type="range"
          min={6}
          max={168}
          step={6}
          value={config.recentBuildsHours ?? 48}
          onChange={(e) => onChange({ recentBuildsHours: Number(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>6h</span>
          <span>168h (7d)</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Max completed to show</label>
          <input
            type="number"
            min={1}
            max={50}
            value={config.maxCompletedBuilds ?? 10}
            onChange={(e) => onChange({ maxCompletedBuilds: Number(e.target.value) })}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Max failed to show</label>
          <input
            type="number"
            min={1}
            max={50}
            value={config.maxFailedBuilds ?? 10}
            onChange={(e) => onChange({ maxFailedBuilds: Number(e.target.value) })}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </div>
      </div>
    </section>
  );
}
