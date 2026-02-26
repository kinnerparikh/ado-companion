import type { ExtensionConfig } from "@/storage/types";

interface Props {
  config: ExtensionConfig;
  onChange: (patch: Partial<ExtensionConfig>) => void;
}

export default function PollingSection({ config, onChange }: Props) {
  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Polling</h2>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Active interval (builds running): {config.activePollingInterval}s
          </label>
          <input
            type="range"
            min={10}
            max={120}
            step={5}
            value={config.activePollingInterval}
            onChange={(e) =>
              onChange({ activePollingInterval: Number(e.target.value) })
            }
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Idle interval (no builds): {config.idlePollingInterval}s
          </label>
          <input
            type="range"
            min={60}
            max={600}
            step={30}
            value={config.idlePollingInterval}
            onChange={(e) =>
              onChange({ idlePollingInterval: Number(e.target.value) })
            }
            className="w-full"
          />
        </div>
      </div>
    </section>
  );
}
