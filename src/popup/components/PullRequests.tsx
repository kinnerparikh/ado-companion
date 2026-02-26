import type { CachedPR } from "@/storage/types";

interface Props {
  prs: CachedPR[];
}

export default function PullRequests({ prs }: Props) {
  const sorted = [...prs].sort(
    (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
  );

  return (
    <div className="border-b border-gray-200">
      <h2 className="text-xs font-semibold text-gray-500 uppercase px-3 py-2 bg-gray-50">
        Pull Requests
      </h2>
      {sorted.length === 0 ? (
        <p className="text-xs text-gray-400 px-3 py-3 text-center">No active PRs</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {sorted.map((pr) => (
            <li key={pr.id}>
              <a
                href={pr.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-3 hover:bg-gray-50 cursor-pointer"
              >
                <p className="text-sm text-gray-800 truncate hover:text-blue-600">{pr.title}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {pr.projectName} / {pr.repositoryName}
                </p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
