import { useState } from "react";
import Popup from "@/popup/Popup";
import Options from "@/options/Options";
import { scenarios } from "./mocks/ado-data";
import { loadScenario } from "./mocks/chrome-api";

type ScenarioKey = keyof typeof scenarios;

export default function DevShell() {
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>("connected");
  const [view, setView] = useState<"popup" | "options">("popup");

  const handleScenarioChange = (key: ScenarioKey) => {
    setActiveScenario(key);
    loadScenario(scenarios[key]);
    // Force re-render by toggling view briefly
    setView((v) => v);
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          ADO Companion — Dev Harness
        </h1>

        {/* Controls */}
        <div className="flex gap-4 mb-6 items-center flex-wrap">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Scenario</label>
            <select
              value={activeScenario}
              onChange={(e) => handleScenarioChange(e.target.value as ScenarioKey)}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm"
            >
              {Object.entries(scenarios).map(([key, s]) => (
                <option key={key} value={key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">View</label>
            <div className="flex gap-1">
              <button
                onClick={() => setView("popup")}
                className={`px-3 py-1.5 text-sm rounded cursor-pointer ${
                  view === "popup"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Popup
              </button>
              <button
                onClick={() => setView("options")}
                className={`px-3 py-1.5 text-sm rounded cursor-pointer ${
                  view === "options"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Options
              </button>
            </div>
          </div>
        </div>

        {/* Render area */}
        <div className="flex justify-center">
          {view === "popup" ? (
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
              <Popup />
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 w-full max-w-xl">
              <Options />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
