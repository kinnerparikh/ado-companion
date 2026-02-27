import type { CachedBuild } from "@/storage/types";
import PipelineCard from "./PipelineCard";

interface Props {
  builds: CachedBuild[];
}

export default function RunningPipelines({ builds }: Props) {
  const sorted = [...builds].sort(
    (a, b) => new Date(b.queueTime).getTime() - new Date(a.queueTime).getTime()
  );

  return (
    <div>
      <h2 className="text-xs font-semibold text-gray-500 uppercase px-3 py-2 bg-gray-50">
        Running Pipelines
      </h2>
      {sorted.length === 0 ? (
        <p className="text-xs text-gray-400 px-3 py-3 text-center">No running pipelines</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {sorted.map((build) => (
            <PipelineCard key={build.id} build={build} />
          ))}
        </ul>
      )}
    </div>
  );
}
