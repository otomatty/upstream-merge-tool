日付: 2025-10-19
実装者: AI Assistant
ステータス: 実装計画書

# GUI 設定ページ改善実装計画

## 概要

現在のファイル選択ベースの設定ページを、プリセット管理システムベースの改善されたUIに変更する。

## 実装の流れ（フェーズ別）

### Phase 1: 型定義と基盤整備（優先度：高）

#### 1-1. IPC 型定義の拡張

**ファイル**: `src/shared/types/ipc.ts`

追加する型定義：

```typescript
// プリセット定義
export type ConfigPreset = {
  id: string;                          // UUID v4
  name: string;                        // プリセット名
  description?: string;                // 説明（オプション）
  createdAt: number;                   // 作成日時（タイムスタンプ）
  updatedAt: number;                   // 更新日時（タイムスタンプ）
  isDefault: boolean;                  // デフォルト設定かどうか
  config: {
    // Upstream 設定
    upstream_repository_name: string;
    upstream_branch_name: string;
    upstream_version_tracking?: {
      enabled: boolean;
      type?: 'tag' | 'package' | 'manual';
      value?: string;
    };
    
    // ローカル設定
    local_repository_path: string;
    merge_target_branch: string;
    
    // メタデータ（最後のマージ情報）
    last_merged_upstream_commit?: string;
    last_merged_upstream_version?: string;
    
    // マーカー設定
    custom_code_marker: {
      start: string;
      end: string;
    };
  };
};

// プリセット一覧応答
export type PresetListResponse = {
  presets: ConfigPreset[];
  defaultPresetId?: string;
};

// プリセット操作結果
export type PresetOperationResult = {
  success: boolean;
  presetId?: string;
  error?: string;
};
```

**実装の注意点**:
- 既存の `ConfigType` との互換性を保つため、拡張型として定義
- IPC 通信用なので、JSON シリアライズ可能な構造に統一

---

#### 1-2. ディレクトリ構造の準備

**作成するディレクトリ**:
```
src/
├── config/
│   └── PresetManager.ts               # 新規作成
├── electron/
│   └── ipc/
│       └── presetHandlers.ts           # 新規作成
└── renderer/
    ├── components/
    │   ├── UpstreamConfigForm.tsx      # 新規作成
    │   ├── LocalConfigForm.tsx         # 新規作成
    │   ├── PresetManager.tsx           # 新規作成
    │   ├── PresetSelector.tsx          # 新規作成
    │   └── ConfigValidator.tsx         # 新規作成（オプション）
    └── hooks/
        └── usePresets.ts               # 新規作成
```

---

### Phase 2: Electron 側 IPC ハンドラー実装（優先度：高）

#### 2-1. PresetManager クラス実装

**ファイル**: `src/config/PresetManager.ts`

```typescript
import { readFile, writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';
import type { ConfigPreset, PresetOperationResult } from '@shared/types/ipc';
import type { Logger } from '@/logger/Logger';

export class PresetManager {
  private presetsDir: string;
  private metadataFile: string;

  constructor(
    private logger: Logger,
    private userDataPath: string,
  ) {
    this.presetsDir = join(userDataPath, 'presets');
    this.metadataFile = join(userDataPath, 'presets-metadata.json');
  }

  /**
   * プリセット一覧取得
   */
  async listPresets(): Promise<ConfigPreset[]> {
    try {
      if (!existsSync(this.presetsDir)) {
        return [];
      }

      // ディレクトリ内の JSON ファイルを読み込む
      const files = await readdir(this.presetsDir);
      const presets: ConfigPreset[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const preset = await this.loadPresetFile(join(this.presetsDir, file));
          if (preset) {
            presets.push(preset);
          }
        }
      }

      return presets.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      this.logger.error(`Failed to list presets: ${error}`);
      return [];
    }
  }

  /**
   * プリセット保存
   */
  async savePreset(preset: ConfigPreset): Promise<PresetOperationResult> {
    try {
      // ディレクトリが存在しない場合は作成
      if (!existsSync(this.presetsDir)) {
        await mkdir(this.presetsDir, { recursive: true });
      }

      // ID がない場合は生成
      const id = preset.id || randomUUID();

      // 更新日時を現在時刻に設定
      const presetToSave: ConfigPreset = {
        ...preset,
        id,
        updatedAt: Date.now(),
      };

      const filePath = join(this.presetsDir, `${id}.json`);
      await writeFile(filePath, JSON.stringify(presetToSave, null, 2), 'utf-8');

      this.logger.info(`Preset saved: ${id} (${preset.name})`);

      return {
        success: true,
        presetId: id,
      };
    } catch (error) {
      this.logger.error(`Failed to save preset: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * プリセット削除
   */
  async deletePreset(presetId: string): Promise<PresetOperationResult> {
    try {
      const filePath = join(this.presetsDir, `${presetId}.json`);

      if (!existsSync(filePath)) {
        return {
          success: false,
          error: 'Preset not found',
        };
      }

      await unlink(filePath);
      this.logger.info(`Preset deleted: ${presetId}`);

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to delete preset: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * プリセット読み込み
   */
  async loadPreset(presetId: string): Promise<ConfigPreset | null> {
    const filePath = join(this.presetsDir, `${presetId}.json`);
    return this.loadPresetFile(filePath);
  }

  /**
   * デフォルトプリセット取得
   */
  async getDefaultPreset(): Promise<ConfigPreset | null> {
    try {
      const presets = await this.listPresets();
      const defaultPreset = presets.find((p) => p.isDefault);
      return defaultPreset || null;
    } catch (error) {
      this.logger.error(`Failed to get default preset: ${error}`);
      return null;
    }
  }

  /**
   * デフォルトプリセット設定
   */
  async setDefaultPreset(presetId: string): Promise<PresetOperationResult> {
    try {
      const presets = await this.listPresets();

      // 既存のデフォルト設定を解除
      for (const preset of presets) {
        if (preset.isDefault) {
          preset.isDefault = false;
          await this.savePreset(preset);
        }
      }

      // 新しいデフォルト設定を適用
      const targetPreset = presets.find((p) => p.id === presetId);
      if (!targetPreset) {
        return {
          success: false,
          error: 'Preset not found',
        };
      }

      targetPreset.isDefault = true;
      const result = await this.savePreset(targetPreset);

      this.logger.info(`Default preset set: ${presetId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to set default preset: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // プライベートメソッド
  private async loadPresetFile(filePath: string): Promise<ConfigPreset | null> {
    try {
      if (!existsSync(filePath)) {
        return null;
      }

      const content = await readFile(filePath, 'utf-8');
      const preset: ConfigPreset = JSON.parse(content);

      return preset;
    } catch (error) {
      this.logger.error(`Failed to load preset file: ${error}`);
      return null;
    }
  }
}
```

**重要**: `readdir` を import する必要があります（後ほど修正）

---

#### 2-2. IPC ハンドラー実装

**ファイル**: `src/electron/ipc/presetHandlers.ts` (新規作成)

```typescript
import { ipcMain, BrowserWindow, app } from 'electron';
import { PresetManager } from '@/config/PresetManager';
import { Logger } from '@/logger/Logger';
import type { ConfigPreset, PresetListResponse } from '@shared/types/ipc';

const logger = new Logger();
let presetManager: PresetManager;

export function registerPresetHandlers(mainWindow: BrowserWindow | null) {
  // 初期化（mainWindow 作成後に一度だけ呼ばれる）
  if (!presetManager) {
    presetManager = new PresetManager(logger, app.getPath('userData'));
  }

  // プリセット一覧取得
  ipcMain.handle('preset:list', async (): Promise<PresetListResponse> => {
    try {
      const presets = await presetManager.listPresets();
      const defaultPreset = await presetManager.getDefaultPreset();

      return {
        presets,
        defaultPresetId: defaultPreset?.id,
      };
    } catch (error) {
      logger.error(`Failed to list presets: ${error}`);
      throw error;
    }
  });

  // プリセット保存
  ipcMain.handle(
    'preset:save',
    async (_event, preset: ConfigPreset) => {
      try {
        const result = await presetManager.savePreset(preset);
        return result;
      } catch (error) {
        logger.error(`Failed to save preset: ${error}`);
        throw error;
      }
    },
  );

  // プリセット削除
  ipcMain.handle('preset:delete', async (_event, presetId: string) => {
    try {
      const result = await presetManager.deletePreset(presetId);
      return result;
    } catch (error) {
      logger.error(`Failed to delete preset: ${error}`);
      throw error;
    }
  });

  // プリセット読み込み
  ipcMain.handle(
    'preset:load',
    async (_event, presetId: string): Promise<ConfigPreset | null> => {
      try {
        const preset = await presetManager.loadPreset(presetId);
        return preset;
      } catch (error) {
        logger.error(`Failed to load preset: ${error}`);
        throw error;
      }
    },
  );

  // デフォルトプリセット設定
  ipcMain.handle('preset:setDefault', async (_event, presetId: string) => {
    try {
      const result = await presetManager.setDefaultPreset(presetId);
      return result;
    } catch (error) {
      logger.error(`Failed to set default preset: ${error}`);
      throw error;
    }
  });

  // デフォルトプリセット取得
  ipcMain.handle(
    'preset:getDefault',
    async (): Promise<ConfigPreset | null> => {
      try {
        const preset = await presetManager.getDefaultPreset();
        return preset;
      } catch (error) {
        logger.error(`Failed to get default preset: ${error}`);
        return null;
      }
    },
  );
}
```

---

### Phase 3: React コンポーネント実装（優先度：高）

#### 3-1. UpstreamConfigForm コンポーネント

**ファイル**: `src/renderer/components/UpstreamConfigForm.tsx`

```typescript
import React, { useState, useCallback, useMemo } from 'react';
import { AlertCircle, Info } from 'lucide-react';
import type { ConfigPreset } from '@shared/types/ipc';

interface UpstreamConfigFormProps {
  initialConfig?: ConfigPreset['config'];
  onConfigChange: (config: Partial<ConfigPreset['config']>) => void;
  onValidationChange: (isValid: boolean, errors: string[]) => void;
}

export default function UpstreamConfigForm({
  initialConfig,
  onConfigChange,
  onValidationChange,
}: UpstreamConfigFormProps) {
  const [config, setConfig] = useState(initialConfig?.upstream_repository_name ?? '');
  const [branchName, setBranchName] = useState(initialConfig?.upstream_branch_name ?? '');
  const [versionTracking, setVersionTracking] = useState(
    initialConfig?.upstream_version_tracking?.enabled ?? true,
  );
  const [versionType, setVersionType] = useState(
    initialConfig?.upstream_version_tracking?.type ?? 'tag',
  );
  const [versionValue, setVersionValue] = useState(
    initialConfig?.upstream_version_tracking?.value ?? '',
  );

  // バリデーション
  const { errors, isValid } = useMemo(() => {
    const errs: string[] = [];

    if (!config.trim()) {
      errs.push('Upstream リモート名は必須です');
    } else if (!/^[a-zA-Z0-9_-]+$/.test(config)) {
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
  }, [config, branchName, versionTracking, versionType, versionValue]);

  // 外部への通知
  React.useEffect(() => {
    onValidationChange(isValid, errors);

    if (isValid) {
      onConfigChange({
        upstream_repository_name: config,
        upstream_branch_name: branchName,
        upstream_version_tracking: versionTracking
          ? {
              enabled: true,
              type: versionType as 'tag' | 'package' | 'manual',
              value: versionType === 'manual' ? versionValue : undefined,
            }
          : { enabled: false },
      });
    }
  }, [config, branchName, versionTracking, versionType, versionValue, isValid, errors]);

  return (
    <div className="space-y-6">
      {/* Upstream リモート情報 */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Upstream リモート設定</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* リモート名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              リモート名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={config}
              onChange={(e) => setConfig(e.target.value)}
              placeholder="upstream"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              git remote -v で確認できる Upstream リポジトリ名
            </p>
          </div>

          {/* ブランチ名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ブランチ名 <span className="text-red-500">*</span>
            </label>
            <input
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

      {/* バージョン追跡設定 */}
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
                      onChange={(e) => setVersionType(e.target.value as typeof type)}
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
                  指定するバージョン（例: v1.2.3、1.2.3など）
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* バリデーション結果 */}
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
```

---

#### 3-2. LocalConfigForm コンポーネント

**ファイル**: `src/renderer/components/LocalConfigForm.tsx`

```typescript
import React, { useState, useCallback, useMemo } from 'react';
import { AlertCircle, Folder } from 'lucide-react';
import type { ConfigPreset } from '@shared/types/ipc';

interface LocalConfigFormProps {
  initialConfig?: ConfigPreset['config'];
  onConfigChange: (config: Partial<ConfigPreset['config']>) => void;
  onValidationChange: (isValid: boolean, errors: string[]) => void;
}

export default function LocalConfigForm({
  initialConfig,
  onConfigChange,
  onValidationChange,
}: LocalConfigFormProps) {
  const [repoPath, setRepoPath] = useState(initialConfig?.local_repository_path ?? '');
  const [targetBranch, setTargetBranch] = useState(
    initialConfig?.merge_target_branch ?? 'main',
  );
  const [startMarker, setStartMarker] = useState(
    initialConfig?.custom_code_marker.start ?? '## BEGIN CUSTOM CODE SECTION',
  );
  const [endMarker, setEndMarker] = useState(
    initialConfig?.custom_code_marker.end ?? '## END CUSTOM CODE SECTION',
  );

  // ディレクトリ選択ダイアログ
  const handleSelectDirectory = useCallback(async () => {
    try {
      const result = await (window as any).electronAPI?.file?.openDirectory?.({
        properties: ['openDirectory'],
      });

      if (result && !result.canceled && result.filePaths.length > 0) {
        setRepoPath(result.filePaths[0]);
      }
    } catch (error) {
      console.error('Failed to select directory:', error);
    }
  }, []);

  // バリデーション
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

    if (startMarker === endMarker) {
      errs.push('開始マーカーと終了マーカーは異なる必要があります');
    }

    return {
      errors: errs,
      isValid: errs.length === 0,
    };
  }, [repoPath, targetBranch, startMarker, endMarker]);

  // 外部への通知
  React.useEffect(() => {
    onValidationChange(isValid, errors);

    if (isValid) {
      onConfigChange({
        local_repository_path: repoPath,
        merge_target_branch: targetBranch,
        custom_code_marker: {
          start: startMarker,
          end: endMarker,
        },
      });
    }
  }, [repoPath, targetBranch, startMarker, endMarker, isValid, errors]);

  return (
    <div className="space-y-6">
      {/* ローカルリポジトリ */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">ローカルリポジトリ設定</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            リポジトリパス <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            マージ先ブランチ <span className="text-red-500">*</span>
          </label>
          <input
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

      {/* カスタムコード保護設定 */}
      <section className="space-y-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <h3 className="font-medium text-gray-900">独自実装部分の保護設定</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            カスタムコード開始マーカー <span className="text-red-500">*</span>
          </label>
          <input
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            カスタムコード終了マーカー <span className="text-red-500">*</span>
          </label>
          <input
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

      {/* バリデーション結果 */}
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
```

---

#### 3-3. PresetManager コンポーネント

**ファイル**: `src/renderer/components/PresetManager.tsx`

より簡潔な実装を後ほど用意

---

### Phase 4: ConfigPage の再実装（優先度：高）

**主な変更**:
1. タブベースのレイアウトに変更
2. 複数のフォームコンポーネントを組み込み
3. プリセット管理機能の統合
4. 保存・読み込みフローの改善

---

## 実装の優先順序

### 必須（高優先度）
1. IPC 型定義拡張 (Phase 1-1)
2. PresetManager クラス (Phase 2-1)
3. IPC ハンドラー (Phase 2-2)
4. UpstreamConfigForm コンポーネント (Phase 3-1)
5. LocalConfigForm コンポーネント (Phase 3-2)
6. ConfigPage 再実装 (Phase 4)

### 推奨（中優先度）
7. PresetManager UI コンポーネント (Phase 3-3)
8. ディレクトリ選択機能の拡張
9. プリセットのインポート/エクスポート

### オプション（低優先度）
10. プリセットテンプレート
11. 設定バージョン管理
12. GUI テストケース追加

---

## 関連ドキュメント

- 詳細分析: `docs/07_research/2025_10/20251119_01_current-implementation-analysis.md`
- 既存要件: `docs/02_requirements/features/upstream-merge-tool-requirements.md`
- GUI 提案: `docs/09_improvements/20251019_01_gui-implementation-proposal.md`
