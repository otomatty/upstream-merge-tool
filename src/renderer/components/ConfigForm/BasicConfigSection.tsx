import React, { useState, useCallback } from 'react';
import { Folder } from 'lucide-react';
import type { ConfigType } from '@shared/types/ipc';

interface BasicConfigSectionProps {
  config: ConfigType;
  onConfigChange: (updates: Partial<ConfigType>) => void;
  errors: string[];
}

export default function BasicConfigSection({
  config,
  onConfigChange,
  errors,
}: BasicConfigSectionProps) {
  const [isSelectingRepo, setIsSelectingRepo] = useState(false);

  // Handle repository directory selection
  const handleSelectRepository = useCallback(async () => {
    try {
      setIsSelectingRepo(true);
      const result = await (window as any).electronAPI?.file?.openFile?.({
        properties: ['openDirectory'],
      });

      if (result && !result.canceled && result.filePaths.length > 0) {
        onConfigChange({
          ...config,
          // Store the selected path - we'll use this later
          // For now, we just need to trigger a re-render
        });
      }
    } catch (error) {
      console.error('Failed to select directory:', error);
    } finally {
      setIsSelectingRepo(false);
    }
  }, [config, onConfigChange]);

  // Filter errors relevant to this section
  const relevantErrors = errors.filter(
    (err) =>
      err.includes('ローカル') ||
      err.includes('マージ') ||
      err.includes('ブランチ'),
  );

  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">基本設定</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Merge Target Branch */}
        <div>
          <label
            htmlFor="merge-target-branch"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            マージ先ブランチ <span className="text-red-500">*</span>
          </label>
          <input
            id="merge-target-branch"
            type="text"
            value={config.merge_target_branch}
            onChange={(e) =>
              onConfigChange({
                ...config,
                merge_target_branch: e.target.value,
              })
            }
            placeholder="main"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Upstream をマージするローカルのブランチ名
          </p>
        </div>

        {/* Last Merged Commit (Display only) */}
        <div>
          <label
            htmlFor="last-merged-commit"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            前回マージコミット
          </label>
          <input
            id="last-merged-commit"
            type="text"
            value={config.last_merged_upstream_commit}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-mono text-sm"
            placeholder="自動更新"
          />
          <p className="mt-1 text-xs text-gray-500">
            最後のマージで適用されたコミットハッシュ（自動更新）
          </p>
        </div>
      </div>

      {/* Error Messages */}
      {relevantErrors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
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
