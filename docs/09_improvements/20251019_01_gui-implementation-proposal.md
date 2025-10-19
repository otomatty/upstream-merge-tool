# Electron GUI 実装提案書

**作成日**: 2025-10-19  
**最終更新日**: 2025-10-19  
**ステータス**: 実装前提案

---

## 1. 概要

現在の CLI ベースのマージツールに Electron GUI を統合し、TypeScript ベースで実装することで、チーム全体が理解・保守できる実装を実現する。

### 1.1 基本方針

- **技術スタック**: Electron + React + TypeScript（全て TypeScript で統一）
- **動作モード**: GUI がデフォルト、CLI はオプションとして利用可能
- **コード共有**: 既存のビジネスロジック（Git 操作、競合解決）をそのまま再利用
- **デプロイ**: マージツールの埋め込み配布のみ対応
- **ビジュアル機能**: コンフリクト箇所を diff 表示で視覚的に確認・解決可能

---

## 2. 提案するアーキテクチャ

### 2.1 ディレクトリ構造

```
upstream-merge-tool/
├── src/
│   ├── main.ts                          # CLI エントリーポイント（従来）
│   ├── electron/
│   │   ├── main.ts                      # Electron メインプロセス
│   │   ├── preload.ts                   # セキュリティブリッジ
│   │   ├── ipc/
│   │   │   ├── configHandlers.ts        # 設定ファイル操作 IPC
│   │   │   ├── gitHandlers.ts           # Git 操作 IPC
│   │   │   ├── conflictHandlers.ts      # 競合解決 IPC
│   │   │   └── reportHandlers.ts        # レポート取得 IPC
│   │   └── utils/
│   │       ├── window.ts                # ウィンドウ管理
│   │       └── pathResolver.ts          # パス解決
│   ├── renderer/
│   │   ├── components/
│   │   │   ├── ConfigPanel.tsx          # 設定パネル
│   │   │   ├── MergePanel.tsx           # マージ実行パネル
│   │   │   ├── ConflictViewer.tsx       # 競合ビューア（Diff 表示）
│   │   │   ├── ReportPanel.tsx          # レポート表示
│   │   │   └── StatusBar.tsx            # ステータスバー
│   │   ├── pages/
│   │   │   ├── ConfigPage.tsx           # 設定ページ
│   │   │   ├── MergePage.tsx            # マージ実行ページ
│   │   │   ├── ConflictPage.tsx         # 競合解決ページ
│   │   │   └── ReportPage.tsx           # レポート表示ページ
│   │   ├── hooks/
│   │   │   ├── useElectronIPC.ts        # IPC フック
│   │   │   └── useMergeWorkflow.ts      # マージワークフロー管理
│   │   ├── App.tsx                      # ルートコンポーネント
│   │   ├── index.tsx                    # レンダラープロセスエントリ
│   │   └── styles/
│   │       └── global.css
│   ├── shared/
│   │   ├── types/                       # 既存のビジネスロジック型
│   │   ├── utils/                       # 共有ユーティリティ
│   │   └── ipc-types.ts                 # IPC 通信型定義
│   ├── config/                          # 既存のコンフィグモジュール（再利用）
│   ├── git/                             # 既存の Git モジュール（再利用）
│   ├── conflict/                        # 既存の競合解決モジュール（再利用）
│   ├── report/                          # 既存のレポートモジュール（再利用）
│   ├── logger/                          # 既存のロガー（再利用）
│   └── utils/                           # 既存のユーティリティ（再利用）
├── public/
│   ├── index.html                       # メインウィンドウ HTML
│   └── icon.(png|ico)
├── electron-builder.json                # Electron Builder 設定
├── tsconfig.json                        # 統一 TypeScript 設定
├── vite.config.ts                       # Vite 設定（レンダラープロセス ビルド）
├── webpack.config.js                    # Webpack 設定（Electron ビルド）
├── package.json                         # 更新版
└── README.md                            # ドキュメント更新
```

### 2.2 技術スタック詳細

```json
{
  "dependencies": {
    "electron": "^latest",
    "react": "^18",
    "react-dom": "^18",
    "react-router-dom": "^6",
    "typescript": "^5"
  },
  "devDependencies": {
    "electron-builder": "^latest",
    "vite": "^latest",
    "@vitejs/plugin-react": "^latest",
    "tailwindcss": "^latest",
    "lucide-react": "^latest"
  }
}
```

### 2.3 アーキテクチャ図

```
┌─────────────────────────────────────────────────────────────────┐
│                     Electron メインプロセス                      │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  IPC ハンドラー                                         │    │
│  │  ├─ configHandlers                                    │    │
│  │  ├─ gitHandlers                                       │    │
│  │  ├─ conflictHandlers                                  │    │
│  │  └─ reportHandlers                                    │    │
│  └────────────────────────────────────────────────────────┘    │
│           │                                                      │
│           ▼                                                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  既存ビジネスロジック（再利用）                         │    │
│  │  ├─ ConfigManager                                      │    │
│  │  ├─ GitService                                         │    │
│  │  ├─ ConflictResolver                                  │    │
│  │  └─ ReportGenerator                                   │    │
│  └────────────────────────────────────────────────────────┘    │
│           │                                                      │
│           ▼                                                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Git 操作・ファイルシステム操作                        │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
           ▲                                    ▲
           │ IPC 通信                           │ IPC 通信
           │                                    │
┌──────────┴──────────┬──────────────────────┬─┴─────────────┐
│                     │                      │               │
▼                     ▼                      ▼               ▼
UI Components    Router/State Management   Hooks        Preload Bridge
├─ ConfigPanel    ├─ React Router          ├─ useElectronIPC
├─ MergePanel     ├─ Context API           └─ useMergeWorkflow
├─ ConflictViewer └─ useState
└─ ReportPanel

┌─────────────────────────────────────────────────────────────────┐
│                  Electron レンダラープロセス                    │
│                    React + TypeScript UI                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 実装の流れ（フェーズ別）

### Phase 1: 基盤整備（1-2 週間）

**目標**: Electron + React + TypeScript 開発環境を構築

#### 1.1 プロジェクト構造の準備

- [ ] `package.json` を Electron 対応に更新
- [ ] 新しい `tsconfig.json` 設定（メインプロセス・レンダラー兼用）
- [ ] `vite.config.ts` でレンダラープロセスビルド設定
- [ ] `webpack.config.js` でメインプロセスビルド設定
- [ ] `electron-builder.json` で配布設定

#### 1.2 Electron メインプロセスの実装

```typescript
// src/electron/main.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { registerConfigHandlers } from './ipc/configHandlers';
import { registerGitHandlers } from './ipc/gitHandlers';

let mainWindow: BrowserWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.ts'),
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });

  // 開発環境と本番環境で分岐
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // IPC ハンドラー登録
  registerConfigHandlers();
  registerGitHandlers();
  // ... その他
}

app.on('ready', createWindow);
```

#### 1.3 セキュリティブリッジ（Preload）

```typescript
// src/electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  config: {
    load: (path: string) => ipcRenderer.invoke('config:load', path),
    save: (path: string, config: any) => ipcRenderer.invoke('config:save', path, config),
  },
  git: {
    fetch: () => ipcRenderer.invoke('git:fetch'),
    merge: () => ipcRenderer.invoke('git:merge'),
    status: () => ipcRenderer.invoke('git:status'),
  },
  onMergeProgress: (callback: any) => ipcRenderer.on('git:progress', callback),
});
```

### Phase 2: UI コンポーネント実装（2-3 週間）

**目標**: React コンポーネントベースの UI を構築

#### 2.1 基本ページ構造

```typescript
// src/renderer/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ConfigPage from './pages/ConfigPage';
import MergePage from './pages/MergePage';
import ConflictPage from './pages/ConflictPage';
import ReportPage from './pages/ReportPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/config" element={<ConfigPage />} />
        <Route path="/merge" element={<MergePage />} />
        <Route path="/conflict" element={<ConflictPage />} />
        <Route path="/report" element={<ReportPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

#### 2.2 設定パネル

```typescript
// src/renderer/components/ConfigPanel.tsx
// 設定ファイルの表示・編集
// JSON エディタの組み込み
```

#### 2.3 競合ビューア（重点実装）

```typescript
// src/renderer/components/ConflictViewer.tsx
// 左右差分表示（Upstream側 vs ローカル側）
// マーカー範囲のハイライト
// ワンクリック解決（Upstream採用 or ローカル採用 or 両方採用）
```

### Phase 3: IPC 層実装（1-2 週間）

**目標**: メインプロセスとレンダラーの通信を確立

#### 3.1 設定操作 IPC

```typescript
// src/electron/ipc/configHandlers.ts
import { ipcMain } from 'electron';
import { ConfigManager } from '../../config/ConfigManager';

export function registerConfigHandlers() {
  ipcMain.handle('config:load', async (_event, configPath: string) => {
    const manager = new ConfigManager();
    return await manager.loadConfig(configPath);
  });

  ipcMain.handle('config:validate', async (_event, config: any) => {
    const manager = new ConfigManager();
    return manager.validateConfig(config);
  });
}
```

#### 3.2 Git 操作 IPC

```typescript
// src/electron/ipc/gitHandlers.ts
import { ipcMain } from 'electron';
import { GitService } from '../../git/GitService';

export function registerGitHandlers() {
  ipcMain.handle('git:fetch', async () => {
    const gitService = new GitService();
    return await gitService.fetch('upstream');
  });

  ipcMain.handle('git:merge', async () => {
    const gitService = new GitService();
    return await gitService.merge('upstream', 'main');
  });

  // リアルタイム進捗通知
  ipcMain.handle('git:merge', async (_event) => {
    // ... マージ実行
    mainWindow?.webContents.send('git:progress', { status: 'merging' });
  });
}
```

#### 3.3 競合解決 IPC

```typescript
// src/electron/ipc/conflictHandlers.ts
import { ipcMain } from 'electron';
import { ConflictResolver } from '../../conflict/ConflictResolver';

export function registerConflictHandlers() {
  ipcMain.handle('conflict:list', async () => {
    // コンフリクト一覧取得（差分情報付き）
  });

  ipcMain.handle('conflict:resolve', async (_event, fileId: string, resolution: 'upstream' | 'local' | 'both') => {
    // UI で選択した解決方法を適用
  });

  ipcMain.handle('conflict:getdiff', async (_event, filePath: string) => {
    // 特定ファイルの差分情報を取得
  });
}
```

### Phase 4: エンドツーエンド統合（1-2 週間）

**目標**: 全フロー統合、テスト、デバッグ

- [ ] CLI と GUI の共存動作確認
- [ ] マージワークフロー全体のテスト
- [ ] 競合解決 UI の動作確認
- [ ] パフォーマンステスト（大規模リポジトリ対応）

---

## 4. CLI との共存方式

### 4.1 起動方式

```bash
# GUI 起動（デフォルト）
npm start

# CLI 起動（オプション）
npm run start:cli

# または
node bin/merge-tool
```

### 4.2 package.json の更新

```json
{
  "scripts": {
    "start": "electron .",
    "start:cli": "tsx src/main.ts",
    "start:dev": "concurrently \"vite\" \"electron-dev .\"",
    "build:gui": "vite build && electron-builder",
    "build:cli": "bun build ./src/main.ts --compile --outfile ./bin/merge-tool",
    "build:all": "npm run build:gui && npm run build:cli"
  }
}
```

---

## 5. 競合ビューアの詳細設計

### 5.1 UI コンポーネント構造

```
┌─────────────────────────────────────────────────────────────┐
│ ConflictPage                                                │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ConflictList (左側)                                    │ │
│  │ ├─ conflict-file-1  [●] (自動解決可能)               │ │
│  │ ├─ conflict-file-2  [✕] (手動解決必要)               │ │
│  │ └─ conflict-file-3  [●]                              │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ConflictViewer (右側)                                  │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ ファイル: src/components/Form.tsx                      │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ [Upstream] ────────────────────── [Local]             │ │
│  │                                                        │ │
│  │ 101 | function Form() {    101 | function Form() {   │ │
│  │ 102 |   const [value,      102 |   const [value,     │ │
│  │ 103 |     setValue]         103 |     setValue]       │ │
│  │ 104 |     = useState('');   104 |     = useState(''); │ │
│  │ 105 |                       105 |                     │ │
│  │ 106 |   return (            106 |   return (         │ │
│  │ ──── | <<<<<<< HEAD                                  │ │
│  │ 107✕| <input              107✔ | <TextInput         │ │
│  │ 108✕|   type="text"        108✔ |   type="text"      │ │
│  │ ──── | =======                                        │ │
│  │ ──── | >>>>>>> upstream/main                          │ │
│  │ 109 |   value={value}     109 |   value={value}     │ │
│  │ 110 |   onChange={...}    110 |   onChange={...}    │ │
│  │ 111 | );                   111 | );                  │ │
│  │                                                        │ │
│  │ [🔧 カスタムコード範囲]                               │ │
│  │ ├─ // CUSTOM-CODE-START (Line 101)                  │ │
│  │ └─ // CUSTOM-CODE-END (Line 111)                    │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ ⚠️ 競合タイプ: 手動解決必要                          │ │
│  │    Upstream側に変更があり、マーカー外の競合です       │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ [✔ Upstream採用] [✔ ローカル採用] [✔ 両方採用] [編集] │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 差分情報の構造

```typescript
// src/shared/types/conflict.ts
interface ConflictFile {
  id: string;
  path: string;
  status: 'auto-resolvable' | 'manual-required' | 'resolved';
  conflicts: Conflict[];
}

interface Conflict {
  id: string;
  lineStart: number;
  lineEnd: number;
  upstream: {
    start: number;
    end: number;
    content: string;
  };
  local: {
    start: number;
    end: number;
    content: string;
  };
  customMarkerInfo: {
    insideMarker: boolean;
    markerStart: number;
    markerEnd: number;
  };
  canAutoResolve: boolean;
  reason?: string;
}

interface DiffInfo {
  file: ConflictFile;
  upstreamDiff: DiffLine[];
  localDiff: DiffLine[];
}

interface DiffLine {
  lineNumber: number;
  type: 'context' | 'added' | 'removed' | 'conflict';
  content: string;
  highlightRanges?: Array<{ start: number; end: number }>;
}
```

### 5.3 解決オプション

```typescript
enum ResolutionStrategy {
  UPSTREAM = 'upstream',           // Upstream側を採用
  LOCAL = 'local',                 // ローカル側を採用
  BOTH = 'both',                   // 両方を採用（競合マーカー削除）
  MANUAL = 'manual',               // 手動編集
}
```

---

## 6. 実装上の注意点

### 6.1 既存コード再利用

- **✅ そのまま再利用可能**: ConfigManager, GitService, ConflictResolver, ReportGenerator, Logger
- **⚠️ 若干の修正が必要**: ファイル I/O 部分（Node.js のみで動作するため、メインプロセスで実行）
- **❌ 再実装が必要**: CLI 出力ロジック（GUI の状態管理に置き換え）

### 6.2 セキュリティ考慮

- IPC 通信は型安全に
- ファイルアクセスはメインプロセス経由のみ
- ユーザー入力のサニタイゼーション
- Electron セキュリティベストプラクティス準拠

### 6.3 パフォーマンス

- 大規模ファイルの差分表示は仮想スクロール採用
- Git 操作はワーカースレッド化を検討
- IPC 通信のデバウンス処理

---

## 7. 実装例：競合解決ページ

```typescript
// src/renderer/pages/ConflictPage.tsx
import { useState, useEffect } from 'react';
import { useElectronIPC } from '../hooks/useElectronIPC';
import ConflictList from '../components/ConflictList';
import ConflictViewer from '../components/ConflictViewer';

export default function ConflictPage() {
  const [conflicts, setConflicts] = useState<ConflictFile[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<string | null>(null);
  const ipc = useElectronIPC();

  useEffect(() => {
    ipc.conflict.list().then(setConflicts);
  }, []);

  const handleResolve = async (fileId: string, strategy: ResolutionStrategy) => {
    await ipc.conflict.resolve(fileId, strategy);
    setConflicts(conflicts.map(c => 
      c.id === fileId ? { ...c, status: 'resolved' } : c
    ));
  };

  return (
    <div className="flex h-full">
      <div className="w-1/3 border-r">
        <ConflictList 
          conflicts={conflicts}
          selected={selectedConflict}
          onSelect={setSelectedConflict}
        />
      </div>
      <div className="w-2/3">
        {selectedConflict && (
          <ConflictViewer
            conflictId={selectedConflict}
            onResolve={handleResolve}
          />
        )}
      </div>
    </div>
  );
}
```

---

## 8. ロードマップ

| フェーズ | 期間 | 主な作業 |
|---------|------|--------|
| Phase 1 | 1-2週間 | Electron 開発環境構築、メインプロセス実装 |
| Phase 2 | 2-3週間 | React UI 実装、ルーティング、状態管理 |
| Phase 3 | 1-2週間 | IPC ハンドラー実装、Git/競合解決連携 |
| Phase 4 | 1-2週間 | 統合テスト、デバッグ、デプロイメント準備 |
| **合計** | **5-9週間** | **本格運用開始** |

---

## 9. 関連ドキュメント

- 既存アーキテクチャ: `docs/03_design/architecture/upstream-merge-tool-architecture.md`
- 要件定義: `docs/02_requirements/features/upstream-merge-tool-requirements.md`
- テストケース: `docs/05_testing/test-cases/upstream-merge-tool-test-cases.md`

---

## 10. 次のステップ

1. **実装プランの細分化**: Phase 1 の詳細な実装タスク表を作成
2. **プロトタイプ開発**: Electron 基盤 + 簡易コンポーネント
3. **既存コードの IPC 対応**: ConfigManager などをメインプロセスで動作するように調整
4. **テスト戦略**: 既存の E2E テストの Electron GUI 対応版を設計
