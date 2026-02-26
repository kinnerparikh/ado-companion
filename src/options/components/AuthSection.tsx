import { useState } from "react";
import { AdoClient, AdoApiError } from "@/api/ado-client";
import type { ExtensionConfig } from "@/storage/types";

interface Props {
  config: ExtensionConfig;
  onChange: (patch: Partial<ExtensionConfig>) => void;
}

export default function AuthSection({ config, onChange }: Props) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const handleTest = async () => {
    if (!config.organization || !config.pat) {
      setTestResult({ ok: false, message: "Organization and PAT are required." });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const client = new AdoClient(config.organization, config.pat);
      const data = await client.getConnectionData();
      setTestResult({
        ok: true,
        message: `Connected as ${data.authenticatedUser.providerDisplayName}`,
      });
    } catch (err) {
      const message =
        err instanceof AdoApiError && err.status === 401
          ? "Invalid or expired PAT."
          : err instanceof Error
            ? err.message
            : "Connection failed.";
      setTestResult({ ok: false, message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Authentication</h2>

      <label className="block text-xs text-gray-500 mb-1">Organization</label>
      <input
        type="text"
        value={config.organization}
        onChange={(e) => onChange({ organization: e.target.value.trim() })}
        placeholder="e.g. msazure"
        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm mb-3"
      />

      <label className="block text-xs text-gray-500 mb-1">Personal Access Token</label>
      <input
        type="password"
        value={config.pat}
        onChange={(e) => onChange({ pat: e.target.value })}
        placeholder="Paste your PAT"
        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm mb-3"
      />

      <button
        onClick={handleTest}
        disabled={testing}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
      >
        {testing ? "Testing…" : "Test Connection"}
      </button>

      {testResult && (
        <p
          className={`mt-2 text-xs ${testResult.ok ? "text-green-600" : "text-red-500"}`}
        >
          {testResult.message}
        </p>
      )}
    </section>
  );
}
