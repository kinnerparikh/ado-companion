import { useState } from "react";
import { relativeTime } from "@/shared/utils";
import type { CachedBuild } from "@/storage/types";

interface Props {
  build: CachedBuild;
}

export default function PipelineCard({ build }: Props) {
  const [expanded, setExpanded] = useState(false);
  const progressPct =
    build.totalTasks > 0
      ? Math.round((build.completedTasks / build.totalTasks) * 100)
      : 0;

  const statusColor =
    build.status === "inProgress"
      ? "text-blue-500"
      : build.result === "failed"
        ? "text-red-500"
        : build.result === "canceled"
          ? "text-yellow-500"
          : "text-gray-500";

  return (
    <li className="px-3 py-3">
      <a
        href={build.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block cursor-pointer"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-800 truncate hover:text-blue-600">
              {build.definitionName}
            </p>
            <p className="text-xs text-gray-400 truncate mt-0.5">
              {build.projectName} · {relativeTime(build.queueTime)}
            </p>
          </div>
          <span className={`text-xs font-medium ml-2 ${statusColor}`}>
            {build.status === "inProgress"
              ? "Running"
              : build.result ?? build.status}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-2">
          <div className="flex justify-between text-xs text-gray-400 mb-0.5">
            <span>
              {build.completedTasks} / {build.totalTasks} tasks
            </span>
            <span>{progressPct}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </a>

      {/* Job breakdown (collapsible) — outside the link to avoid nested interactivity */}
      {build.jobs.length > 0 && (
        <div className="mt-1.5">
          <button
            className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "▼" : "▶"} {build.jobs.length} job{build.jobs.length !== 1 ? "s" : ""}
          </button>
          {expanded && (
            <ul className="mt-1 space-y-0.5 ml-2">
              {build.jobs.map((job) => {
                const jobColor =
                  job.state === "completed" && job.result === "succeeded"
                    ? "text-green-500"
                    : job.state === "completed" && job.result === "failed"
                      ? "text-red-500"
                      : job.state === "inProgress"
                        ? "text-blue-500"
                        : "text-gray-400";
                return (
                  <li key={job.name} className="text-xs flex items-center gap-1">
                    <span className={jobColor}>●</span>
                    <span className="text-gray-600 truncate">{job.name}</span>
                    <span className="text-gray-400 ml-auto">
                      {job.completedTasks}/{job.totalTasks}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
