import React, { useState, useCallback, useEffect } from 'react';
import { FileUp, AlertCircle, CheckCircle, Loader, Settings, X } from 'lucide-react';
import type { ConfigType } from '@shared/types/ipc';

interface ConfigFormProps {
  onSave: (config: ConfigType) => Promise<void>;
  onValidate: (config: Partial<ConfigType>) => Promise<{ isValid: boolean; errors: string[] }>;
  onNext: () => void;
}

export default function ConfigForm({ onSave, onValidate, onNext }: ConfigFormProps) {
  const [filePath, setFilePath] = useState<string>('');
  const [defaultPath, setDefaultPath] = useState<string | null>(null);
  const [config, setConfig] = useState<Partial<ConfigType>>({
    upstream_repository_name: '',
    upstream_branch_name: '',
    last_merged_upstream_commit: '',
    custom_code_marker: {
      start: '## BEGIN CUSTOM CODE SECTION',
      end: '## END CUSTOM CODE SECTION',
    },
  });
  const [jsonContent, setJsonContent] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // 初期化時にデフォルト設定を読み込む
  useEffect(() => {
    const loadDefaultConfig = async () => {
      try {
        console.log('Checking for electronAPI:', !!(window as any).electronAPI);
        console.log('Config methods:', (window as any).electronAPI?.config);
        
        // Electron環境でない場合はスキップ
        if (!(window as any).electronAPI?.config?.getDefaultPath) {
          console.log('ElectronAPI not available, skipping default config load');
          // ブラウザでのテスト用に、test-config.jsonがあれば表示
          setFilePath('/Users/sugaiakimasa/apps/upstream-merge-tool/test-config.json');
          return;
        }
        
        const defaultConfigPath = await (window as any).electronAPI?.config?.getDefaultPath?.();
        console.log('Default config path:', defaultConfigPath);
        
        if (defaultConfigPath) {
          setDefaultPath(defaultConfigPath);
          
          // デフォルト設定ファイルを自動読み込み
          const loadedConfig = await (window as any).electronAPI.config.load(defaultConfigPath);
          setConfig(loadedConfig);
          setJsonContent(JSON.stringify(loadedConfig, null, 2));
          setFilePath(defaultConfigPath);

          // バリデーション実行
          const validationResult = await onValidate(loadedConfig);
          setIsValid(validationResult.isValid);
          setErrors(validationResult.errors);

          if (validationResult.isValid) {
            setSuccessMessage('デフォルト設定ファイルが自動読み込みされました。');
          }
        } else {
          console.log('No default config path found');
        }
      } catch (error) {
        console.error('Failed to load default config:', error);
      }
    };

    loadDefaultConfig();
  }, [onValidate]);

  // ファイルを読み込む共通処理
  const loadConfigFile = useCallback(async (path: string) => {
    try {
      setIsLoading(true);
      setErrors([]);
      setSuccessMessage('');

      const loadedConfig = await (window as any).electronAPI.config.load(path);
      setConfig(loadedConfig);
      setJsonContent(JSON.stringify(loadedConfig, null, 2));
      setFilePath(path);

      // バリデーション実行
      const validationResult = await onValidate(loadedConfig);
      setIsValid(validationResult.isValid);
      setErrors(validationResult.errors);

      if (validationResult.isValid) {
        setSuccessMessage('設定ファイルが正常に読み込まれました。');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '不明なエラーが発生しました';
      setErrors([`ファイル読み込みエラー: ${message}`]);
      console.error('File loading error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onValidate]);

  // ファイル選択ダイアログを開く
  const handleSelectFile = useCallback(async () => {
    try {
      // Electron dialog API を使用してファイルを選択
      const result = await (window as any).electronAPI?.file?.openFile?.({
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
        properties: ['openFile'],
      });

      if (result && !result.canceled && result.filePaths.length > 0) {
        const path = result.filePaths[0];
        await loadConfigFile(path);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '不明なエラーが発生しました';
      setErrors([`ファイル選択エラー: ${message}`]);
      console.error('File selection error:', error);
    }
  }, [loadConfigFile]);

  // JSON 内容の変更時
  const handleJsonChange = useCallback(async (value: string) => {
    setJsonContent(value);
    setSuccessMessage('');

    try {
      const parsed = JSON.parse(value);
      setConfig(parsed);

      // リアルタイムバリデーション
      const validationResult = await onValidate(parsed);
      setIsValid(validationResult.isValid);
      setErrors(validationResult.errors);
    } catch (error) {
      const message = error instanceof Error ? error.message : '不正な JSON です';
      setIsValid(false);
      setErrors([message]);
    }
  }, [onValidate]);

  // このファイルをデフォルトとして設定
  const handleSetAsDefault = useCallback(async () => {
    if (!filePath) return;
    
    if (!(window as any).electronAPI?.config?.setDefaultPath) {
      setErrors(['Electron環境でないため、デフォルト設定を保存できません']);
      return;
    }
    
    try {
      console.log('🔧 Setting default path:', filePath);
      await (window as any).electronAPI?.config?.setDefaultPath?.(filePath);
      setDefaultPath(filePath);
      setSuccessMessage('デフォルト設定ファイルとして保存されました。');
      console.log('✅ Default path set successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'デフォルト設定の保存に失敗しました';
      setErrors([message]);
      console.error('❌ Failed to set default path:', error);
    }
  }, [filePath]);

  // デフォルト設定をクリア
  const handleClearDefault = useCallback(async () => {
    if (!(window as any).electronAPI?.config?.clearDefault) {
      setErrors(['Electron環境でないため、デフォルト設定をクリアできません']);
      return;
    }
    
    try {
      await (window as any).electronAPI?.config?.clearDefault?.();
      setDefaultPath(null);
      setSuccessMessage('デフォルト設定をクリアしました。');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'デフォルト設定のクリアに失敗しました';
      setErrors([message]);
    }
  }, []);

  // デフォルト設定を再読み込み
  const handleLoadDefault = useCallback(async () => {
    if (!defaultPath) return;
    await loadConfigFile(defaultPath);
  }, [defaultPath, loadConfigFile]);

  // 設定を保存
  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);
      setErrors([]);
      setSuccessMessage('');

      // バリデーション再実行
      const validationResult = await onValidate(config);
      if (!validationResult.isValid) {
        setErrors(validationResult.errors);
        setIsValid(false);
        return;
      }

      // 設定を保存
      if (filePath) {
        await onSave(config as ConfigType);
        setSuccessMessage('設定ファイルが正常に保存されました。');
        setIsValid(true);
      } else {
        setErrors(['ファイルパスが指定されていません']);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '不明なエラーが発生しました';
      setErrors([`保存エラー: ${message}`]);
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  }, [config, filePath, onSave, onValidate]);

  return (
    <div className="space-y-6">
      {/* ファイル選択セクション */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">設定ファイルの選択</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              設定ファイルパス
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={filePath}
                readOnly
                placeholder="/path/to/config.json"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
              />
              <button
                onClick={handleSelectFile}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                {isLoading ? <Loader className="animate-spin" size={18} /> : <FileUp size={18} />}
                ファイルを選択
              </button>
            </div>
            
            {/* デフォルト設定コントロール */}
            <div className="mt-3 flex flex-wrap gap-2">
              {/* デバッグ情報 */}
              <div className="w-full text-xs text-gray-500 mb-2 p-2 bg-gray-50 rounded">
                <div>🔧 Debug Info:</div>
                <div>• defaultPath: {defaultPath || '未設定'}</div>
                <div>• filePath: {filePath || '未選択'}</div>
                <div>• electronAPI: {(window as any).electronAPI ? '✅ 利用可能' : '❌ 利用不可'}</div>
                <div>• 表示される機能:</div>
                <div className="ml-4">
                  {defaultPath && `• デフォルト表示: ${defaultPath.split('/').pop()}`}
                  {defaultPath && defaultPath !== filePath && `• デフォルト読み込みボタン`}
                  {filePath && filePath !== defaultPath && `• デフォルト設定ボタン`}
                  {!defaultPath && !filePath && `• まずファイルを選択してください`}
                </div>
              </div>
              
              {defaultPath && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Settings size={16} />
                  <span>デフォルト: {defaultPath.split('/').pop()}</span>
                  <button
                    onClick={handleClearDefault}
                    className="text-red-600 hover:text-red-800"
                    title="デフォルト設定をクリア"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              
              {defaultPath && defaultPath !== filePath && (
                <button
                  onClick={handleLoadDefault}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1"
                >
                  <Settings size={14} />
                  デフォルトを読み込み
                </button>
              )}
              
              {filePath && filePath !== defaultPath && (
                <button
                  onClick={handleSetAsDefault}
                  className="px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200 flex items-center gap-1"
                >
                  <Settings size={14} />
                  デフォルトに設定
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* JSON エディタセクション */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">設定内容（JSON）</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              JSON エディタ
            </label>
            <textarea
              value={jsonContent}
              onChange={(e) => handleJsonChange(e.target.value)}
              placeholder={JSON.stringify(
                {
                  upstream_repository_name: 'upstream/repo',
                  upstream_branch_name: 'main',
                  last_merged_upstream_commit: 'abc123...',
                  custom_code_marker: {
                    start: '## BEGIN CUSTOM CODE SECTION',
                    end: '## END CUSTOM CODE SECTION',
                  },
                },
                null,
                2
              )}
              className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* バリデーション結果 */}
          {errors.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="font-semibold text-red-800 mb-2">バリデーションエラー</h3>
                  <ul className="list-disc list-inside space-y-1 text-red-700 text-sm">
                    {errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {isValid && successMessage && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="font-semibold text-green-800">{successMessage}</h3>
                </div>
              </div>
            </div>
          )}

          {/* 設定内容サマリー */}
          {config.upstream_repository_name && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">設定情報</h4>
              <dl className="space-y-1 text-sm text-blue-800">
                <div>
                  <dt className="font-medium">リポジトリ:</dt>
                  <dd className="text-gray-700">{config.upstream_repository_name}</dd>
                </div>
                <div>
                  <dt className="font-medium">ブランチ:</dt>
                  <dd className="text-gray-700">{config.upstream_branch_name}</dd>
                </div>
                <div>
                  <dt className="font-medium">最終マージコミット:</dt>
                  <dd className="text-gray-700 font-mono text-xs">
                    {config.last_merged_upstream_commit?.substring(0, 12)}...
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </div>

      {/* ボタンセクション */}
      <div className="flex justify-end gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving || !isValid || !filePath}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
        >
          {isSaving ? <Loader className="animate-spin" size={18} /> : '保存'}
        </button>
        <button
          onClick={onNext}
          disabled={!isValid}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          次へ
        </button>
      </div>
    </div>
  );
}
