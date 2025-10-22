import React from 'react';
import type { ConfigType } from '@shared/types/ipc';

interface CodeMarkerSectionProps {
  config: ConfigType;
  onConfigChange: (updates: Partial<ConfigType>) => void;
  errors: string[];
}

export default function CodeMarkerSection({
  config,
  onConfigChange,
  errors,
}: CodeMarkerSectionProps) {
  // Filter errors relevant to this section
  const relevantErrors = errors.filter((err) =>
    err.includes('マーカー') || err.includes('コード'),
  );

  return (
    <section className="space-y-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
      <h3 className="text-lg font-semibold text-gray-900">
        独自実装部分の保護設定
      </h3>

      <p className="text-sm text-gray-600">
        以下のマーカーで囲まれたコード領域は、マージ時に自動的に保護されます。
      </p>

      <div className="space-y-3">
        {/* Start Marker */}
        <div>
          <label
            htmlFor="code-marker-start"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            カスタムコード開始マーカー <span className="text-red-500">*</span>
          </label>
          <input
            id="code-marker-start"
            type="text"
            value={config.custom_code_marker.start}
            onChange={(e) =>
              onConfigChange({
                ...config,
                custom_code_marker: {
                  ...config.custom_code_marker,
                  start: e.target.value,
                },
              })
            }
            placeholder="## BEGIN CUSTOM CODE SECTION"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            この行とコード保護終了マーカーの間が自動的に保護されます
          </p>
        </div>

        {/* End Marker */}
        <div>
          <label
            htmlFor="code-marker-end"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            カスタムコード終了マーカー <span className="text-red-500">*</span>
          </label>
          <input
            id="code-marker-end"
            type="text"
            value={config.custom_code_marker.end}
            onChange={(e) =>
              onConfigChange({
                ...config,
                custom_code_marker: {
                  ...config.custom_code_marker,
                  end: e.target.value,
                },
              })
            }
            placeholder="## END CUSTOM CODE SECTION"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            カスタムコード保護区間の終了マーカー
          </p>
        </div>
      </div>

      {/* Error Messages */}
      {relevantErrors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg mt-3">
          <p className="text-sm text-red-700 font-medium">エラー:</p>
          <ul className="list-disc list-inside text-sm text-red-600 mt-1">
            {relevantErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
