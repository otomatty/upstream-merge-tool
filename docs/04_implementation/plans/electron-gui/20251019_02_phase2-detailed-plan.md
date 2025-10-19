# Electron GUI 実装 - Phase 2 詳細計画書

**作成日**: 2025-10-19  
**ステータス**: 実装開始予定  
**期間**: 2-3 週間

---

## 1. Phase 2 の目標

Phase 1 で構築した基盤の上に、**実動作する UI と IPC 通信の完全実装**を行う。

**成果物**:
- Preload スクリプトによるセキュアな IPC ブリッジ
- 各ページの完全な UI 実装（Tailwind CSS）
- 既存ビジネスロジックとの完全な統合
- 開発環境での完全な動作確認

---

## 2. 実装タスク詳細

### 2.1 Preload スクリプト実装（優先度: 最高）

#### タスク 2.1.1: `src/electron/preload.ts` 実装

**目的**: メインプロセスと レンダラープロセス間の安全な通信ブリッジを構築

**実装内容**:

```typescript
// src/electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import type {
  ConfigType,
  MergeResult,
  ConflictFile,
  ProgressEvent,
} from '@shared/types/ipc';

// コンテキストブリッジで IPC API を公開
contextBridge.exposeInMainWorld('electronAPI', {
  // Config 操作
  loadConfig: () => ipcRenderer.invoke('config:load'),
  saveConfig: (config: ConfigType) =>
    ipcRenderer.invoke('config:save', config),

  // Git 操作
  fetchUpstream: (args: {
    repoPath: string;
    remoteName: string;
  }) => ipcRenderer.invoke('git:fetch', args),

  mergeUpstream: (args: {
    repoPath: string;
    upstreamBranch: string;
    localBranch: string;
  }) => ipcRenderer.invoke('git:merge', args),

  addChanges: (repoPath: string) =>
    ipcRenderer.invoke('git:add', repoPath),

  commitChanges: (args: {
    repoPath: string;
    message: string;
  }) => ipcRenderer.invoke('git:commit', args),

  // 競合解決
  resolveConflict: (args: {
    filePath: string;
    resolution: 'ours' | 'theirs' | 'manual';
    content?: string;
  }) => ipcRenderer.invoke('conflict:resolve', args),

  // レポート
  generateReport: (repoPath: string) =>
    ipcRenderer.invoke('report:generate', repoPath),

  // イベントリスナー
  onProgress: (
    callback: (event: ProgressEvent) => void
  ) => ipcRenderer.on('progress', (_event, data) => callback(data)),

  onConflict: (callback: (files: ConflictFile[]) => void) =>
    ipcRenderer.on('conflict', (_event, data) => callback(data)),
});

// 型定義を window に追加
declare global {
  interface Window {
    electronAPI: {
      loadConfig: () => Promise<ConfigType>;
      saveConfig: (config: ConfigType) => Promise<void>;
      fetchUpstream: (args: {
        repoPath: string;
        remoteName: string;
      }) => Promise<void>;
      mergeUpstream: (args: {
        repoPath: string;
        upstreamBranch: string;
        localBranch: string;
      }) => Promise<MergeResult>;
      addChanges: (repoPath: string) => Promise<void>;
      commitChanges: (args: {
        repoPath: string;
        message: string;
      }) => Promise<void>;
      resolveConflict: (args: {
        filePath: string;
        resolution: 'ours' | 'theirs' | 'manual';
        content?: string;
      }) => Promise<void>;
      generateReport: (repoPath: string) => Promise<string>;
      onProgress: (callback: (event: ProgressEvent) => void) => void;
      onConflict: (callback: (files: ConflictFile[]) => void) => void;
    };
  }
}
```

**チェックリスト**:
- [ ] Preload スクリプト作成
- [ ] TypeScript コンパイルエラーなし
- [ ] IPC チャネルが適切に定義されている

#### タスク 2.1.2: Electron main.ts に Preload パス設定

**修正対象**: `src/electron/main.ts`

```typescript
// ウィンドウ作成時に preload パスを指定
const mainWindow = new BrowserWindow({
  width: 1200,
  height: 800,
  webPreferences: {
    preload: path.join(__dirname, '../electron/preload.js'),
    nodeIntegration: false,
    contextIsolation: true,
    enableRemoteModule: false,
    sandbox: true,
  },
});
```

**チェックリスト**:
- [ ] Preload パスが正確に指定されている
- [ ] セキュリティ設定が適切（nodeIntegration: false など）

---

### 2.2 Vite & React ビルド設定

#### タスク 2.2.1: `vite.config.ts` の完成

**目的**: React アプリケーションのホットリロード対応開発環境構築

**実装内容**:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true,
    },
  },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@renderer': path.resolve(__dirname, './src/renderer'),
      '@electron': path.resolve(__dirname, './src/electron'),
    },
  },
  define: {
    __DEV__: JSON.stringify(true),
  },
});
```

**チェックリスト**:
- [ ] ホットリロード設定確認
- [ ] 出力パス設定確認
- [ ] パスエイリアス動作確認

#### タスク 2.2.2: `public/index.html` の確認と最適化

**確認項目**:
- [ ] React ルートエレメント確認
- [ ] Meta タグ（charset, viewport）設定確認
- [ ] 適切な初期タイトル設定

---

### 2.3 ConfigPage 実装

#### タスク 2.3.1: リポジトリ設定フォーム

**実装内容**:
- リポジトリパスの入力フィールド
- リモート名の選択ドロップダウン
- ローカルブランチの選択ドロップダウン
- アップストリームブランチの入力フィールド

**UI コンポーネント**:

```typescript
// src/renderer/pages/ConfigPage.tsx
import React, { useState, useEffect } from 'react';
import { AlertCircle, Save } from 'lucide-react';

interface Config {
  repoPath: string;
  remoteName: string;
  localBranch: string;
  upstreamBranch: string;
  upstreamUrl: string;
}

export function ConfigPage() {
  const [config, setConfig] = useState<Config>({
    repoPath: '',
    remoteName: 'origin',
    localBranch: 'main',
    upstreamBranch: 'main',
    upstreamUrl: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const savedConfig = await window.electronAPI.loadConfig();
      if (savedConfig) {
        setConfig(savedConfig);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load configuration'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      await window.electronAPI.saveConfig(config);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to save configuration'
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading configuration...</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">リポジトリ設定</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded flex gap-3">
          <AlertCircle className="text-red-600" size={20} />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded">
          <p className="text-green-800">✓ Configuration saved successfully</p>
        </div>
      )}

      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Repository Path
          </label>
          <input
            type="text"
            value={config.repoPath}
            onChange={(e) =>
              setConfig({ ...config, repoPath: e.target.value })
            }
            className="w-full px-3 py-2 border rounded-md"
            placeholder="/path/to/repository"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Remote Name
            </label>
            <input
              type="text"
              value={config.remoteName}
              onChange={(e) =>
                setConfig({ ...config, remoteName: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Local Branch
            </label>
            <input
              type="text"
              value={config.localBranch}
              onChange={(e) =>
                setConfig({ ...config, localBranch: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Upstream Branch
            </label>
            <input
              type="text"
              value={config.upstreamBranch}
              onChange={(e) =>
                setConfig({
                  ...config,
                  upstreamBranch: e.target.value,
                })
              }
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Upstream URL
            </label>
            <input
              type="text"
              value={config.upstreamUrl}
              onChange={(e) =>
                setConfig({ ...config, upstreamUrl: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save size={18} />
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </button>
      </form>
    </div>
  );
}
```

**チェックリスト**:
- [ ] フォーム実装完了
- [ ] 保存機能動作確認
- [ ] エラーハンドリング確認

---

### 2.4 MergePage 実装

#### タスク 2.4.1: マージ実行画面

**実装内容**:
- Fetch、Merge のボタン
- 進捗表示バー
- 実行ログ表示エリア
- エラー表示エリア

---

### 2.5 ConflictPage 実装

#### タスク 2.5.1: 競合解決インターフェース

**実装内容**:
- 競合ファイルリスト
- ファイルビューア（Diff 表示）
- 解決方法選択（Ours / Theirs / Manual）
- 手動編集エディタ

---

### 2.6 ReportPage 実装

#### タスク 2.6.1: マージレポート表示

**実装内容**:
- マージ統計情報（追加行数、削除行数、変更ファイル数）
- 変更ファイルリスト
- エクスポート機能（PDF、CSV）

---

### 2.7 開発環境統合テスト

#### タスク 2.7.1: npm run dev での動作確認

**実装内容**:
```bash
npm run dev
```

**確認項目**:
- [ ] Vite 開発サーバー起動
- [ ] Electron ウィンドウ表示
- [ ] ホットリロード動作
- [ ] IPC 通信動作
- [ ] ConfigPage で設定保存・読み込み
- [ ] MergePage で Git 操作実行
- [ ] エラーハンドリング動作

---

## 3. 優先順位

1. **Preload スクリプト** - IPC の基盤となるため最優先
2. **Vite 設定と開発環境** - 開発効率が大幅に向上
3. **ConfigPage** - 基本的な UI と IPC 動作確認
4. **MergePage** - メイン機能の動作確認
5. **ConflictPage** - 複雑な競合解決 UI
6. **ReportPage** - 最後のデータ表示画面

---

## 4. 技術的な注意点

### 4.1 Preload スクリプトのセキュリティ

- Context isolation を有効化（`contextIsolation: true`）
- Node.js 統合を無効化（`nodeIntegration: false`）
- サンドボックスを有効化（`sandbox: true`）

### 4.2 IPC チャネル管理

- IPC リスナーのクリーンアップ（メモリリーク防止）
- タイムアウト処理の実装
- エラーハンドリングの適切な実装

### 4.3 型安全性

- Preload で Window 型に拡張を定義
- 各 IPC ハンドラーで型チェック

---

## 5. 依存関係

### Phase 1 に依存

- ✅ package.json 更新
- ✅ TypeScript 設定
- ✅ webpack 設定（メインプロセス）
- ✅ IPC ハンドラー実装
- ✅ React アプリケーション構造

### 新規追加が必要

- concurrently（dev コマンド用）
- wait-on（Electron 起動待機用）

---

## 6. 成功基準

Phase 2 が完了したと判断される条件:

1. ✅ `npm run dev` でエラーなく起動
2. ✅ 各ページが表示可能
3. ✅ ConfigPage で設定の保存・読み込みが動作
4. ✅ MergePage で Git 操作が実行可能
5. ✅ ConflictPage で競合表示が可能
6. ✅ ReportPage でレポート表示が可能
7. ✅ IPC 通信が安定動作
8. ✅ コンソールにエラーが出ていない

---

## 7. 関連ドキュメント

- **Phase 1 計画**: `20251019_01_phase1-detailed-plan.md`
- **Phase 1 進捗**: `docs/08_worklogs/2025_10/20251019_17_electron-gui-phase1-progress.md`
- **提案書**: `docs/09_improvements/20251019_01_gui-implementation-proposal.md`
- **アーキテクチャ**: `docs/03_design/architecture/upstream-merge-tool-architecture.md`
