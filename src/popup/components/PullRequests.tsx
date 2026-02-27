import type { CachedPR } from "@/storage/types";

interface Props {
  prs: CachedPR[];
}

function prStatusLabel(pr: CachedPR): { text: string; color: string } {
  if (pr.rejectionCount > 0) return { text: "Changes requested", color: "text-red-500" };
  if (pr.mergeStatus === "conflicts") return { text: "Conflicts", color: "text-red-500" };
  if (pr.waitingCount > 0) return { text: "Waiting on author", color: "text-yellow-500" };
  if (pr.approvalCount > 0) return { text: `${pr.approvalCount} approved`, color: "text-green-500" };
  return { text: "Needs review", color: "text-gray-400" };
}

export default function PullRequests({ prs }: Props) {
  const sorted = [...prs].sort(
    (a, b) => new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime()
  );

  if (sorted.length === 0) {
    return <p className="text-xs text-gray-400 px-3 py-3 text-center">No active PRs</p>;
  }

  return (
    <ul className="divide-y divide-gray-100">
      {sorted.map((pr) => {
        const { text: statusText, color: statusColor } = prStatusLabel(pr);
        return (
          <li key={pr.id}>
            <a
              href={pr.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-3 hover:bg-gray-50 cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <p className="text-sm text-gray-800 truncate flex-1 min-w-0 hover:text-blue-600">
                  {pr.title}
                </p>
                <span className={`text-xs font-medium ml-2 whitespace-nowrap ${statusColor}`}>
                  {statusText}
                </span>
              </div>
              <p className="text-xs text-gray-400 truncate mt-0.5">
                {pr.projectName} / {pr.repositoryName}
                {pr.isDraft && (
                  <span className="ml-1.5 px-1 py-0.5 bg-gray-200 text-gray-500 rounded text-[10px] font-medium uppercase">
                    Draft
                  </span>
                )}
              </p>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
