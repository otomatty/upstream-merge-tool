import React, { useState, useCallback, useMemo } from 'react';
import { AlertCircle, Folder } from 'lucide-react';
import type { LocalConfig, CustomCodeConfig } from '@shared/types/ipc';

interface LocalConfigFormProps {
  initialConfig?: LocalConfig;
  initialCodeMarker?: CustomCodeConfig['custom_code_marker'];
  onConfigChange: (config: Partial<LocalConfig>) => void;
  onCodeMarkerChange?: (markers: CustomCodeConfig['custom_code_marker']) => void;
  onValidationChange: (isValid: boolean, errors: string[]) => void;
}

export default function LocalConfigForm({
  initialConfig,
  initialCodeMarker,
  onConfigChange,
  onCodeMarkerChange,
  onValidationChange,
}: LocalConfigFormProps) {
  const [repoPath, setRepoPath] = useState(initialConfig?.local_repository_path ?? '');
  const [targetBranch, setTargetBranch] = useState(
    initialConfig?.merge_target_branch ?? 'main',
  );
  const [startMarker, setStartMarker] = useState(
    initialCodeMarker?.start ?? '## BEGIN CUSTOM CODE SECTION',
  );
  const [endMarker, setEndMarker] = useState(
    initialCodeMarker?.end ?? '## END CUSTOM CODE SECTION',
  );

  // Handle directory selection
  const handleSelectDirectory = useCallback(async () => {
    try {
      const result = await (window as any).electronAPI?.file?.openFile?.({
        properties: ['openDirectory'],
      });

      if (result && !result.canceled && result.filePaths.length > 0) {
        setRepoPath(result.filePaths[0]);
      }
    } catch (error) {
      console.error('Failed to select directory:', error);
    }
  }, []);

  // Validation logic
  const { errors, isValid } = useMemo(() => {
    const errs: string[] = [];

    if (!repoPath.trim()) {
      errs.push('ローカルリポジトリパスは必須です');
    }

    if (!targetBranch.trim()) {
      errs.push('マージ先ブランチ名は必須です');
    } else if (!/^[a-zA-Z0-9_\-./]+$/.test(targetBranch)) {
      errs.push('ブランチ名は英数字、ハイフン、スラッシュのみ使用可能です');
    }

    if (!startMarker.trim()) {
      errs.push('カスタムコード開始マーカーは必須です');
    }

    if (!endMarker.trim()) {
      errs.push('カスタムコード終了マーカーは必須です');
    }

    if (startMarker.trim() === endMarker.trim()) {
      errs.push('開始マーカーと終了マーカーは異なる必要があります');
    }

    return {
      errors: errs,
      isValid: errs.length === 0,
    };
  }, [repoPath, targetBranch, startMarker, endMarker]);

  // Notify parent of config changes and validation status
  React.useEffect(() => {
    onValidationChange(isValid, errors);

    if (isValid) {
      onConfigChange({
        local_repository_path: repoPath,
        merge_target_branch: targetBranch,
      });

      // Notify code marker changes if callback provided
      onCodeMarkerChange?.({
        start: startMarker,
        end: endMarker,
      });
    }
  }, [
    repoPath,
    targetBranch,
    startMarker,
    endMarker,
    isValid,
    errors,
    onConfigChange,
    onCodeMarkerChange,
    onValidationChange,
  ]);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="pb-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">📤 マージ先 (Local)</h2>
        <p className="text-sm text-gray-600 mt-1">
          ローカルリポジトリの情報を設定します
        </p>
      </div>

      {/* Local Repository Settings */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">ローカルリポジトリ設定</h3>

        <div>
          <label htmlFor="repo-path" className="block text-sm font-medium text-gray-700 mb-2">
            リポジトリパス <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              id="repo-path"
              type="text"
              value={repoPath}
              readOnly
              placeholder="/path/to/your/repository"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
            />
            <button
              onClick={handleSelectDirectory}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Folder size={18} />
              選択
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            .git ディレクトリが存在するディレクトリを選択してください
          </p>
        </div>

        <div>
          <label htmlFor="merge-branch" className="block text-sm font-medium text-gray-700 mb-2">
            マージ先ブランチ <span className="text-red-500">*</span>
          </label>
          <input
            id="merge-branch"
            type="text"
            value={targetBranch}
            onChange={(e) => setTargetBranch(e.target.value)}
            placeholder="main"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Upstream をマージするローカルのブランチ名
          </p>
        </div>
      </section>

      {/* Custom Code Protection Settings */}
      <section className="space-y-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <h3 className="font-medium text-gray-900">独自実装部分の保護設定</h3>

        <div>
          <label
            htmlFor="start-marker"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            カスタムコード開始マーカー <span className="text-red-500">*</span>
          </label>
          <input
            id="start-marker"
            type="text"
            value={startMarker}
            onChange={(e) => setStartMarker(e.target.value)}
            placeholder="## BEGIN CUSTOM CODE SECTION"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            この行とコード保護終了マーカーの間が自動的に保護されます
          </p>
        </div>

        <div>
          <label htmlFor="end-marker" className="block text-sm font-medium text-gray-700 mb-2">
            カスタムコード終了マーカー <span className="text-red-500">*</span>
          </label>
          <input
            id="end-marker"
            type="text"
            value={endMarker}
            onChange={(e) => setEndMarker(e.target.value)}
            placeholder="## END CUSTOM CODE SECTION"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            カスタムコード保護区間の終了マーカー
          </p>
        </div>
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
