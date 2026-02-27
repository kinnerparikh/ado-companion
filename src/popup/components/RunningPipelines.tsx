import type { CachedBuild } from "@/storage/types";
import PipelineCard from "./PipelineCard";

interface Props {
  builds: CachedBuild[];
  emptyText?: string;
}

export default function RunningPipelines({ builds, emptyText = "None" }: Props) {
  const sorted = [...builds].sort(
    (a, b) => new Date(b.queueTime).getTime() - new Date(a.queueTime).getTime()
  );

  if (sorted.length === 0) {
    return <p className="text-xs text-gray-400 px-3 py-3 text-center">{emptyText}</p>;
  }

  return (
    <ul className="divide-y divide-gray-100">
      {sorted.map((build) => (
        <PipelineCard key={build.id} build={build} />
      ))}
    </ul>
  );
}
