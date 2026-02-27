import type { ExtensionConfig } from "@/storage/types";
import { DEFAULT_SECTION_ORDER, type SectionId } from "@/shared/constants";

interface Props {
  config: ExtensionConfig;
  onChange: (patch: Partial<ExtensionConfig>) => void;
}

const SECTION_LABELS: Record<SectionId, string> = {
  pullRequests: "Pull Requests",
  activePipelines: "Active Pipelines",
  completed: "Completed",
  failed: "Failed",
};

export default function SectionOrderSection({ config, onChange }: Props) {
  const order = config.sectionOrder ?? DEFAULT_SECTION_ORDER;

  const move = (index: number, direction: -1 | 1) => {
    const newOrder = [...order];
    const target = index + direction;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
    onChange({ sectionOrder: newOrder });
  };

  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Section Order</h2>
      <p className="text-xs text-gray-400 mb-2">
        Reorder how sections appear in the popup.
      </p>
      <ul className="space-y-1">
        {order.map((id, i) => (
          <li
            key={id}
            className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded border border-gray-200"
          >
            <span className="text-sm text-gray-700">{SECTION_LABELS[id]}</span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={i === 0}
                onClick={() => move(i, -1)}
                className="px-1.5 py-0.5 text-xs rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                aria-label={`Move ${SECTION_LABELS[id]} up`}
              >
                ▲
              </button>
              <button
                type="button"
                disabled={i === order.length - 1}
                onClick={() => move(i, 1)}
                className="px-1.5 py-0.5 text-xs rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                aria-label={`Move ${SECTION_LABELS[id]} down`}
              >
                ▼
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
