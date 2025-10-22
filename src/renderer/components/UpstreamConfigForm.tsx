import React, { useState, useCallback, useMemo } from 'react';
import { AlertCircle, Info } from 'lucide-react';
import type { UpstreamConfig } from '@shared/types/ipc';

interface UpstreamConfigFormProps {
  initialConfig?: UpstreamConfig;
  onConfigChange: (config: Partial<UpstreamConfig>) => void;
  onValidationChange: (isValid: boolean, errors: string[]) => void;
}

export default function UpstreamConfigForm({
  initialConfig,
  onConfigChange,
  onValidationChange,
}: UpstreamConfigFormProps) {
  const [repositoryName, setRepositoryName] = useState(
    initialConfig?.upstream_repository_name ?? '',
  );
  const [branchName, setBranchName] = useState(
    initialConfig?.upstream_branch_name ?? '',
  );
  const [versionTracking, setVersionTracking] = useState(
    initialConfig?.upstream_version_tracking?.enabled ?? true,
  );
  const [versionType, setVersionType] = useState<'tag' | 'package' | 'manual'>(
    initialConfig?.upstream_version_tracking?.type ?? 'tag',
  );
  const [versionValue, setVersionValue] = useState(
    initialConfig?.upstream_version_tracking?.value ?? '',
  );

  // Validation logic
  const { errors, isValid } = useMemo(() => {
    const errs: string[] = [];

    if (!repositoryName.trim()) {
      errs.push('Upstream リモート名は必須です');
    } else if (!/^[a-zA-Z0-9_-]+$/.test(repositoryName)) {
      errs.push('リモート名は英数字、ハイフン、アンダースコアのみ使用可能です');
    }

    if (!branchName.trim()) {
      errs.push('Upstream ブランチ名は必須です');
    }

    if (versionTracking && versionType === 'manual' && !versionValue.trim()) {
      errs.push('手動指定を選択した場合、バージョンを入力してください');
    }

    return {
      errors: errs,
      isValid: errs.length === 0,
    };
  }, [repositoryName, branchName, versionTracking, versionType, versionValue]);

  // Notify parent of config changes and validation status
  React.useEffect(() => {
    onValidationChange(isValid, errors);

    if (isValid) {
      onConfigChange({
        upstream_repository_name: repositoryName,
        upstream_branch_name: branchName,
        upstream_version_tracking: versionTracking
          ? {
              enabled: true,
              type: versionType,
              value: versionType === 'manual' ? versionValue : undefined,
            }
          : { enabled: false },
      });
    }
  }, [
    repositoryName,
    branchName,
    versionTracking,
    versionType,
    versionValue,
    isValid,
    errors,
    onConfigChange,
    onValidationChange,
  ]);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="pb-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">📥 マージ元 (Upstream)</h2>
        <p className="text-sm text-gray-600 mt-1">
          アップストリームリポジトリの情報を設定します
        </p>
      </div>

      {/* Upstream Remote Information */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Upstream リモート設定</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Remote Name */}
          <div>
            <label htmlFor="repo-name" className="block text-sm font-medium text-gray-700 mb-2">
              リモート名 <span className="text-red-500">*</span>
            </label>
            <input
              id="repo-name"
              type="text"
              value={repositoryName}
              onChange={(e) => setRepositoryName(e.target.value)}
              placeholder="upstream"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              git remote -v で確認できる Upstream リポジトリ名
            </p>
          </div>

          {/* Branch Name */}
          <div>
            <label htmlFor="branch-name" className="block text-sm font-medium text-gray-700 mb-2">
              ブランチ名 <span className="text-red-500">*</span>
            </label>
            <input
              id="branch-name"
              type="text"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder="main"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              git branch -r で確認できる Upstream ブランチ名
            </p>
          </div>
        </div>
      </section>

      {/* Version Tracking Settings */}
      <section className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={versionTracking}
                onChange={(e) => setVersionTracking(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="font-medium text-gray-900">
                バージョン追跡を有効にする（推奨）
              </span>
            </label>
            <p className="mt-2 text-sm text-gray-600">
              マージレポートに Upstream バージョン情報を含めます
            </p>
          </div>
        </div>

        {versionTracking && (
          <div className="ml-8 space-y-3">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
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
                      onChange={(e) =>
                        setVersionType(e.target.value as 'tag' | 'package' | 'manual')
                      }
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
                <input
                  type="text"
                  value={versionValue}
                  onChange={(e) => setVersionValue(e.target.value)}
                  placeholder="v1.2.3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  指定するバージョン（例: v1.2.3、1.2.3 など）
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Validation Results */}
      {errors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">
              <p className="font-medium mb-1">設定に問題があります</p>
              <ul className="list-disc list-inside space-y-0.5">
                {errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
