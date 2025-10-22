import React, { useState } from 'react';
import { Info } from 'lucide-react';
import type { ConfigType } from '@shared/types/ipc';

interface UpstreamSectionProps {
  config: ConfigType;
  onConfigChange: (updates: Partial<ConfigType>) => void;
  errors: string[];
}

export default function UpstreamSection({
  config,
  onConfigChange,
  errors,
}: UpstreamSectionProps) {
  const [versionType, setVersionType] = useState<'tag' | 'package' | 'manual'>(
    config.upstream_version_tracking?.type || 'tag',
  );

  // Filter errors relevant to this section
  const relevantErrors = errors.filter(
    (err) =>
      err.includes('Upstream') ||
      err.includes('リモート') ||
      err.includes('upstream'),
  );

  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Upstream リモート設定</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Remote Name */}
        <div>
          <label
            htmlFor="upstream-remote-name"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            リモート名 <span className="text-red-500">*</span>
          </label>
          <input
            id="upstream-remote-name"
            type="text"
            value={config.upstream_repository_name}
            onChange={(e) =>
              onConfigChange({
                ...config,
                upstream_repository_name: e.target.value,
              })
            }
            placeholder="upstream"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            git remote -v で確認できる Upstream リポジトリ名
          </p>
        </div>

        {/* Branch Name */}
        <div>
          <label
            htmlFor="upstream-branch-name"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            ブランチ名 <span className="text-red-500">*</span>
          </label>
          <input
            id="upstream-branch-name"
            type="text"
            value={config.upstream_branch_name}
            onChange={(e) =>
              onConfigChange({
                ...config,
                upstream_branch_name: e.target.value,
              })
            }
            placeholder="main"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            git branch -r で確認できる Upstream ブランチ名
          </p>
        </div>
      </div>

      {/* Version Tracking Settings */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
        <div className="flex items-start gap-2">
          <Info size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="version-tracking"
              checked={config.upstream_version_tracking?.enabled ?? true}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  upstream_version_tracking: {
                    enabled: e.target.checked,
                    type: config.upstream_version_tracking?.type || 'tag',
                    value: config.upstream_version_tracking?.value || '',
                  },
                })
              }
              className="w-4 h-4 rounded"
            />
            <label
              htmlFor="version-tracking"
              className="text-sm font-medium text-gray-900 cursor-pointer"
            >
              バージョン追跡を有効にする（推奨）
            </label>
          </div>
        </div>

        {config.upstream_version_tracking?.enabled && (
          <div className="ml-6 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                バージョン情報の取得方法
              </label>
              <div className="space-y-2">
                {(['tag', 'package', 'manual'] as const).map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="versionType"
                      value={type}
                      checked={versionType === type}
                      onChange={(e) => {
                        const newType = e.target.value as 'tag' | 'package' | 'manual';
                        setVersionType(newType);
                        onConfigChange({
                          ...config,
                          upstream_version_tracking: {
                            enabled: true,
                            type: newType,
                            value: config.upstream_version_tracking?.value || '',
                          },
                        });
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">
                      {type === 'tag' && 'Git タグから自動検出（推奨）'}
                      {type === 'package' && 'package.json から取得'}
                      {type === 'manual' && '手動指定'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {versionType === 'manual' && (
              <div>
                <label
                  htmlFor="manual-version"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  バージョン
                </label>
                <input
                  id="manual-version"
                  type="text"
                  value={config.upstream_version_tracking?.value || ''}
                  onChange={(e) =>
                    onConfigChange({
                      ...config,
                      upstream_version_tracking: {
                        enabled: true,
                        type: versionType,
                        value: e.target.value,
                      },
                    })
                  }
                  placeholder="v1.2.3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            )}
          </div>
        )}
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
