import { useState } from "react";
import type { ExtensionConfig } from "@/storage/types";

interface Props {
  config: ExtensionConfig;
  onChange: (patch: Partial<ExtensionConfig>) => void;
}

export default function ProjectSection({ config, onChange }: Props) {
  const [input, setInput] = useState("");

  const addProject = () => {
    const value = input.trim();
    if (!value) return;

    // Validate format: should be just project name or *
    if (value !== "*" && value.includes("/")) {
      // Accept org/project format but strip org prefix
      const parts = value.split("/");
      const projectName = parts[parts.length - 1];
      if (!config.projects.includes(projectName)) {
        onChange({ projects: [...config.projects, projectName] });
      }
    } else {
      if (!config.projects.includes(value)) {
        onChange({ projects: [...config.projects, value] });
      }
    }
    setInput("");
  };

  const removeProject = (project: string) => {
    onChange({ projects: config.projects.filter((p) => p !== project) });
  };

  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Projects</h2>
      <p className="text-xs text-gray-400 mb-2">
        Add project names to track. Use <code className="bg-gray-100 px-1">*</code> to track all projects.
      </p>

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addProject()}
          placeholder="Project name or *"
          className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
        />
        <button
          onClick={addProject}
          className="px-3 py-1.5 text-sm bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 cursor-pointer"
        >
          Add
        </button>
      </div>

      {config.projects.length > 0 && (
        <ul className="space-y-1">
          {config.projects.map((p) => (
            <li
              key={p}
              className="flex items-center justify-between px-3 py-1.5 bg-gray-50 rounded text-sm"
            >
              <span>
                {config.organization}/{p}
              </span>
              <button
                onClick={() => removeProject(p)}
                className="text-red-400 hover:text-red-600 text-xs cursor-pointer"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
