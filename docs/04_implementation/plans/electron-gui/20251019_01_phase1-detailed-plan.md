# Electron GUI 実装 - Phase 1 詳細計画書

**作成日**: 2025-10-19  
**ステータス**: 実装準備中

---

## 1. Phase 1 の目標

Electron + React + TypeScript 開発環境を完全に構築し、メインプロセスが既存ビジネスロジックと通信する基盤を完成させる。

**期間**: 1-2 週間  
**成果物**: 
- 動作する Electron アプリケーション（空の GUI でも可）
- IPC 通信の基盤完成
- 既存ロジックのメインプロセス統合

---

## 2. 実装タスク詳細

### 2.1 パッケージング & ビルドツール設定

#### タスク 2.1.1: package.json の更新

**目的**: 本番と開発で異なるビルド・実行設定を統一

**作業内容**:

```json
// 以下を package.json に追加
{
  "main": "dist/electron/main.js",
  "homepage": "./",
  "dependencies": {
    "electron-squirrel-startup": "^1.1.0"
  },
  "devDependencies": {
    "electron": "^latest",
    "electron-builder": "^latest",
    "electron-dev": "^latest",
    "vite": "^latest",
    "@vitejs/plugin-react": "^latest",
    "tailwindcss": "^latest",
    "postcss": "^latest",
    "autoprefixer": "^latest",
    "lucide-react": "^latest"
  },
  "scripts": {
    "start": "electron .",
    "start:cli": "tsx src/main.ts",
    "dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && electron .\"",
    "build:gui": "vite build && electron-builder",
    "build:cli": "bun build ./src/main.ts --compile --outfile ./bin/merge-tool",
    "build:all": "npm run build:gui && npm run build:cli"
  }
}
```

**チェックリスト**:
- [ ] 既存スクリプト との互換性確認
- [ ] `npm install` で正常にインストール確認
- [ ] `npm start` で Electron 起動確認

---

#### タスク 2.1.2: TypeScript 設定統一

**目的**: メインプロセス・レンダラー・共有コード全てで同じ TypeScript 設定

**ファイル**: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@shared/*": ["src/shared/*"],
      "@renderer/*": ["src/renderer/*"],
      "@electron/*": ["src/electron/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "src/__tests__"]
}
```

**チェックリスト**:
- [ ] `tsc --noEmit` でエラーなし確認
- [ ] パスエイリアスが機能確認

---

#### タスク 2.1.3: Vite 設定（レンダラープロセス）

**ファイル**: `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@renderer': path.resolve(__dirname, './src/renderer'),
    },
  },
});
```

**チェックリスト**:
- [ ] `npm run dev` で Vite 開発サーバー起動確認
- [ ] ホットリロード動作確認

---

#### タスク 2.1.4: Webpack 設定（メインプロセス）

**ファイル**: `webpack.config.js`

```javascript
const path = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: './src/electron/main.ts',
  output: {
    path: path.resolve(__dirname, 'dist/electron'),
    filename: 'main.js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    plugins: [new TsconfigPathsPlugin()],
  },
  target: 'electron-main',
  devtool: 'source-map',
  externals: {
    // ネイティブモジュールをバンドル対象外
  },
};
```

**チェックリスト**:
- [ ] `npx webpack` でビルド成功確認
- [ ] `dist/electron/main.js` 生成確認

---

#### タスク 2.1.5: electron-builder 設定

**ファイル**: `electron-builder.json`

```json
{
  "appId": "com.example.upstream-merge-tool",
  "productName": "Upstream Merge Tool",
  "directories": {
    "output": "release",
    "buildResources": "public"
  },
  "files": [
    "dist/**/*",
    "package.json",
    "node_modules/**/*"
  ],
  "mac": {
    "target": ["dmg", "zip"],
    "category": "public.app-category.utilities"
  },
  "win": {
    "target": ["nsis", "portable"]
  },
  "linux": {
    "target": ["AppImage", "deb"]
  }
}
```

**チェックリスト**:
- [ ] 設定ファイル構文確認
- [ ] `public/` ディレクトリにアイコン配置

---

### 2.2 Electron メインプロセス実装

#### タスク 2.2.1: 基本的なアプリケーション構造

**ファイル**: `src/electron/main.ts`

```typescript
import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';
import { registerConfigHandlers } from './ipc/configHandlers';
import { registerGitHandlers } from './ipc/gitHandlers';
import { registerConflictHandlers } from './ipc/conflictHandlers';
import { registerReportHandlers } from './ipc/reportHandlers';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
    },
  });

  const startUrl = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../renderer/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' as const },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            // About ダイアログ実装
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.on('ready', () => {
  createWindow();
  createMenu();

  // IPC ハンドラー登録
  registerConfigHandlers(mainWindow);
  registerGitHandlers(mainWindow);
  registerConflictHandlers(mainWindow);
  registerReportHandlers(mainWindow);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
```

**チェックリスト**:
- [ ] TypeScript コンパイル確認
- [ ] Webpack ビルド成功確認
- [ ] `npm start` で空のウィンドウが表示されることを確認

---

#### タスク 2.2.2: Preload スクリプト（セキュリティブリッジ）

**ファイル**: `src/electron/preload.ts`

```typescript
import { contextBridge, ipcRenderer, IpcRenderer } from 'electron';
import type { ConfigType, ConflictFile, MergeResult, ReportSummary } from '@shared/types/ipc';

// IPC 型定義
type ElectronAPI = {
  config: {
    load: (configPath: string) => Promise<ConfigType>;
    save: (configPath: string, config: ConfigType) => Promise<void>;
    validate: (config: Partial<ConfigType>) => Promise<{ isValid: boolean; errors: string[] }>;
  };
  git: {
    fetch: (remote: string) => Promise<void>;
    merge: (remote: string, branch: string) => Promise<MergeResult>;
    status: () => Promise<string>;
    add: (files: string[]) => Promise<void>;
    commit: (message: string) => Promise<void>;
    onProgress: (callback: (data: any) => void) => void;
  };
  conflict: {
    list: () => Promise<ConflictFile[]>;
    getDiff: (filePath: string) => Promise<any>;
    resolve: (fileId: string, strategy: 'upstream' | 'local' | 'both') => Promise<void>;
  };
  report: {
    getSummary: () => Promise<ReportSummary>;
    getDetails: () => Promise<string>;
  };
};

const electronAPI: ElectronAPI = {
  config: {
    load: (configPath) => ipcRenderer.invoke('config:load', configPath),
    save: (configPath, config) => ipcRenderer.invoke('config:save', configPath, config),
    validate: (config) => ipcRenderer.invoke('config:validate', config),
  },
  git: {
    fetch: (remote) => ipcRenderer.invoke('git:fetch', remote),
    merge: (remote, branch) => ipcRenderer.invoke('git:merge', remote, branch),
    status: () => ipcRenderer.invoke('git:status'),
    add: (files) => ipcRenderer.invoke('git:add', files),
    commit: (message) => ipcRenderer.invoke('git:commit', message),
    onProgress: (callback) => {
      ipcRenderer.on('git:progress', (_event, data) => callback(data));
    },
  },
  conflict: {
    list: () => ipcRenderer.invoke('conflict:list'),
    getDiff: (filePath) => ipcRenderer.invoke('conflict:getDiff', filePath),
    resolve: (fileId, strategy) => ipcRenderer.invoke('conflict:resolve', fileId, strategy),
  },
  report: {
    getSummary: () => ipcRenderer.invoke('report:getSummary'),
    getDetails: () => ipcRenderer.invoke('report:getDetails'),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
```

**チェックリスト**:
- [ ] 型安全性確認
- [ ] TypeScript コンパイル確認

---

### 2.3 IPC ハンドラー実装

#### タスク 2.3.1: 設定ハンドラー

**ファイル**: `src/electron/ipc/configHandlers.ts`

```typescript
import { ipcMain, BrowserWindow } from 'electron';
import { ConfigManager } from '@/config/ConfigManager';
import { Logger } from '@/logger/Logger';
import type { ConfigType } from '@shared/types/ipc';

const configManager = new ConfigManager();
const logger = Logger.getInstance();

export function registerConfigHandlers(mainWindow: BrowserWindow | null) {
  ipcMain.handle('config:load', async (_event, configPath: string): Promise<ConfigType> => {
    try {
      logger.info(`Loading config from: ${configPath}`);
      const config = await configManager.loadConfig(configPath);
      return config as ConfigType;
    } catch (error) {
      logger.error(`Failed to load config: ${error}`);
      throw error;
    }
  });

  ipcMain.handle('config:save', async (_event, configPath: string, config: ConfigType) => {
    try {
      logger.info(`Saving config to: ${configPath}`);
      // ConfigManager の save メソッド追加が必要
      const fs = await import('fs/promises');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
      logger.info('Config saved successfully');
    } catch (error) {
      logger.error(`Failed to save config: ${error}`);
      throw error;
    }
  });

  ipcMain.handle('config:validate', async (_event, config: Partial<ConfigType>) => {
    try {
      const result = configManager.validateConfig(config);
      return {
        isValid: result.isValid,
        errors: result.errors,
      };
    } catch (error) {
      logger.error(`Validation error: ${error}`);
      throw error;
    }
  });
}
```

**チェックリスト**:
- [ ] 既存 ConfigManager との統合確認
- [ ] エラーハンドリング確認
- [ ] ログ出力確認

---

#### タスク 2.3.2: Git ハンドラー（進捗表示対応）

**ファイル**: `src/electron/ipc/gitHandlers.ts`

```typescript
import { ipcMain, BrowserWindow } from 'electron';
import { GitService } from '@/git/GitService';
import { Logger } from '@/logger/Logger';
import type { MergeResult } from '@shared/types/ipc';

const gitService = new GitService();
const logger = Logger.getInstance();

export function registerGitHandlers(mainWindow: BrowserWindow | null) {
  ipcMain.handle('git:fetch', async (_event, remote: string) => {
    try {
      logger.info(`Fetching from remote: ${remote}`);
      mainWindow?.webContents.send('git:progress', {
        type: 'fetch',
        status: 'started',
        message: `Fetching from ${remote}...`,
      });

      await gitService.fetch(remote);

      mainWindow?.webContents.send('git:progress', {
        type: 'fetch',
        status: 'completed',
        message: 'Fetch completed',
      });

      logger.info('Fetch completed successfully');
    } catch (error) {
      logger.error(`Fetch failed: ${error}`);
      mainWindow?.webContents.send('git:progress', {
        type: 'fetch',
        status: 'error',
        message: `Fetch failed: ${error}`,
      });
      throw error;
    }
  });

  ipcMain.handle('git:merge', async (_event, remote: string, branch: string): Promise<MergeResult> => {
    try {
      logger.info(`Starting merge: ${remote}/${branch}`);
      mainWindow?.webContents.send('git:progress', {
        type: 'merge',
        status: 'started',
        message: `Starting merge from ${remote}/${branch}...`,
      });

      const result = await gitService.merge(remote, branch);

      mainWindow?.webContents.send('git:progress', {
        type: 'merge',
        status: 'completed',
        message: `Merge completed. Conflicts: ${result.conflicted_files.length}`,
        conflictCount: result.conflicted_files.length,
      });

      logger.info(`Merge completed. Conflicts: ${result.conflicted_files.length}`);
      return result;
    } catch (error) {
      logger.error(`Merge failed: ${error}`);
      mainWindow?.webContents.send('git:progress', {
        type: 'merge',
        status: 'error',
        message: `Merge failed: ${error}`,
      });
      throw error;
    }
  });

  ipcMain.handle('git:status', async () => {
    try {
      const status = await gitService.getStatus();
      return status;
    } catch (error) {
      logger.error(`Status failed: ${error}`);
      throw error;
    }
  });

  ipcMain.handle('git:add', async (_event, files: string[]) => {
    try {
      logger.info(`Staging files: ${files.join(', ')}`);
      mainWindow?.webContents.send('git:progress', {
        type: 'add',
        status: 'started',
        message: `Staging ${files.length} files...`,
      });

      // GitService に add メソッド追加が必要
      for (const file of files) {
        // git add 実行
      }

      mainWindow?.webContents.send('git:progress', {
        type: 'add',
        status: 'completed',
        message: `Staged ${files.length} files`,
      });

      logger.info('Files staged successfully');
    } catch (error) {
      logger.error(`Add failed: ${error}`);
      mainWindow?.webContents.send('git:progress', {
        type: 'add',
        status: 'error',
        message: `Staging failed: ${error}`,
      });
      throw error;
    }
  });

  ipcMain.handle('git:commit', async (_event, message: string) => {
    try {
      logger.info(`Committing with message: ${message}`);
      mainWindow?.webContents.send('git:progress', {
        type: 'commit',
        status: 'started',
        message: 'Committing changes...',
      });

      // GitService に commit メソッド追加が必要
      // git commit 実行

      mainWindow?.webContents.send('git:progress', {
        type: 'commit',
        status: 'completed',
        message: 'Commit completed',
      });

      logger.info('Commit completed successfully');
    } catch (error) {
      logger.error(`Commit failed: ${error}`);
      mainWindow?.webContents.send('git:progress', {
        type: 'commit',
        status: 'error',
        message: `Commit failed: ${error}`,
      });
      throw error;
    }
  });
}
```

**チェックリスト**:
- [ ] 既存 GitService との統合確認
- [ ] 進捗通知メカニズム動作確認
- [ ] add/commit メソッドが GitService に存在することを確認（または追加）

---

#### タスク 2.3.3: 競合ハンドラー

**ファイル**: `src/electron/ipc/conflictHandlers.ts`

```typescript
import { ipcMain } from 'electron';
import { ConflictResolver } from '@/conflict/ConflictResolver';
import { Logger } from '@/logger/Logger';
import type { ConflictFile } from '@shared/types/ipc';

const conflictResolver = new ConflictResolver();
const logger = Logger.getInstance();

let currentConflicts: ConflictFile[] = [];

export function registerConflictHandlers() {
  ipcMain.handle('conflict:list', async (): Promise<ConflictFile[]> => {
    try {
      logger.info('Fetching conflict list');
      const conflicts = await conflictResolver.detectConflicts();
      currentConflicts = conflicts;
      return conflicts;
    } catch (error) {
      logger.error(`Failed to list conflicts: ${error}`);
      throw error;
    }
  });

  ipcMain.handle('conflict:getDiff', async (_event, filePath: string) => {
    try {
      logger.info(`Getting diff for: ${filePath}`);
      const diffInfo = await conflictResolver.getDiffInfo(filePath);
      return diffInfo;
    } catch (error) {
      logger.error(`Failed to get diff: ${error}`);
      throw error;
    }
  });

  ipcMain.handle('conflict:resolve', async (
    _event,
    fileId: string,
    strategy: 'upstream' | 'local' | 'both'
  ) => {
    try {
      logger.info(`Resolving conflict: ${fileId} with strategy: ${strategy}`);
      // ConflictResolver のメソッドを呼び出し
      await conflictResolver.resolveConflict(fileId, strategy);
      logger.info('Conflict resolved');
    } catch (error) {
      logger.error(`Failed to resolve conflict: ${error}`);
      throw error;
    }
  });
}
```

**チェックリスト**:
- [ ] ConflictResolver との統合確認
- [ ] getDiffInfo メソッドが存在することを確認（または追加）
- [ ] resolveConflict メソッドの実装確認

---

#### タスク 2.3.4: レポートハンドラー

**ファイル**: `src/electron/ipc/reportHandlers.ts`

```typescript
import { ipcMain } from 'electron';
import { ReportGenerator } from '@/report/ReportGenerator';
import { Logger } from '@/logger/Logger';

const reportGenerator = new ReportGenerator();
const logger = Logger.getInstance();

export function registerReportHandlers() {
  ipcMain.handle('report:getSummary', async () => {
    try {
      logger.info('Generating report summary');
      const report = await reportGenerator.generate();
      return {
        status: report.status,
        timestamp: report.timestamp,
        mergedCommit: report.merged_commit,
        conflictCount: report.conflict_files.length,
        resolvedCount: report.resolved_conflicts,
      };
    } catch (error) {
      logger.error(`Failed to generate report: ${error}`);
      throw error;
    }
  });

  ipcMain.handle('report:getDetails', async () => {
    try {
      logger.info('Fetching report details');
      const report = await reportGenerator.generate();
      return report;
    } catch (error) {
      logger.error(`Failed to fetch report: ${error}`);
      throw error;
    }
  });
}
```

**チェックリスト**:
- [ ] ReportGenerator との統合確認

---

### 2.4 共有型定義

#### タスク 2.4.1: IPC 型定義

**ファイル**: `src/shared/types/ipc.ts`

```typescript
export type ConfigType = {
  upstream_repository_name: string;
  upstream_branch_name: string;
  last_merged_upstream_commit: string;
  custom_code_marker: {
    start: string;
    end: string;
  };
  upstream_version_tracking?: {
    enabled: boolean;
    type: 'tag' | 'package' | 'manual';
    value: string;
  };
};

export type MergeResult = {
  status: 'success' | 'conflict' | 'error';
  message: string;
  conflicted_files: string[];
  merged_commit: string;
};

export type ConflictFile = {
  id: string;
  path: string;
  status: 'auto-resolvable' | 'manual-required' | 'resolved';
  conflicts: Conflict[];
};

export type Conflict = {
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
  canAutoResolve: boolean;
};

export type ReportSummary = {
  status: 'success' | 'partial' | 'error';
  timestamp: string;
  mergedCommit: string;
  conflictCount: number;
  resolvedCount: number;
};

export type ProgressEvent = {
  type: 'fetch' | 'merge' | 'add' | 'commit';
  status: 'started' | 'completed' | 'error';
  message: string;
  conflictCount?: number;
};
```

**チェックリスト**:
- [ ] TypeScript コンパイル確認
- [ ] すべての IPC メソッドで型が定義されていることを確認

---

### 2.5 React アプリケーション基礎

#### タスク 2.5.1: エントリーポイント & ルーティング

**ファイル**: `src/renderer/index.tsx`

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**ファイル**: `src/renderer/App.tsx`

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import ConfigPage from './pages/ConfigPage';
import MergePage from './pages/MergePage';
import ConflictPage from './pages/ConflictPage';
import ReportPage from './pages/ReportPage';
import StatusBar from './components/StatusBar';

export default function App() {
  const [currentStep, setCurrentStep] = useState<'config' | 'merge' | 'conflict' | 'report'>('config');

  return (
    <BrowserRouter>
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/config" />} />
            <Route 
              path="/config" 
              element={<ConfigPage onNext={() => setCurrentStep('merge')} />} 
            />
            <Route 
              path="/merge" 
              element={<MergePage onNext={() => setCurrentStep('conflict')} />} 
            />
            <Route 
              path="/conflict" 
              element={<ConflictPage onNext={() => setCurrentStep('report')} />} 
            />
            <Route 
              path="/report" 
              element={<ReportPage />} 
            />
          </Routes>
        </div>
        <StatusBar currentStep={currentStep} />
      </div>
    </BrowserRouter>
  );
}
```

**チェックリスト**:
- [ ] React Router インストール確認
- [ ] 基本的なルーティング動作確認

---

#### タスク 2.5.2: IPC フック

**ファイル**: `src/renderer/hooks/useElectronIPC.ts`

```typescript
import { useEffect, useCallback } from 'react';
import type { ProgressEvent } from '@shared/types/ipc';

export function useElectronIPC() {
  // Preload スクリプトで exposed したオブジェクトにアクセス
  const api = (window as any).electronAPI;

  if (!api) {
    throw new Error('Electron IPC API not available');
  }

  return api;
}

export function useGitProgress(onProgress: (event: ProgressEvent) => void) {
  const api = useElectronIPC();

  useEffect(() => {
    api.git.onProgress(onProgress);
  }, [api, onProgress]);
}

export function useMergeWorkflow() {
  const api = useElectronIPC();

  const startMerge = useCallback(async (remote: string, branch: string) => {
    return await api.git.merge(remote, branch);
  }, [api]);

  const getConflicts = useCallback(async () => {
    return await api.conflict.list();
  }, [api]);

  const resolveConflict = useCallback(
    async (fileId: string, strategy: 'upstream' | 'local' | 'both') => {
      return await api.conflict.resolve(fileId, strategy);
    },
    [api]
  );

  const stageFiles = useCallback(async (files: string[]) => {
    return await api.git.add(files);
  }, [api]);

  return {
    startMerge,
    getConflicts,
    resolveConflict,
    stageFiles,
  };
}
```

**チェックリスト**:
- [ ] TypeScript 型安全性確認

---

#### タスク 2.5.3: HTML テンプレート

**ファイル**: `public/index.html`

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Upstream Merge Tool</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/renderer/index.tsx"></script>
</body>
</html>
```

**チェックリスト**:
- [ ] ファイルパス確認

---

### 2.6 既存コードの IPC 対応調査

#### タスク 2.6.1: GitService 確認

**チェック項目**:
- [ ] `fetch(remoteName)` メソッド存在確認
- [ ] `merge(remoteName, branchName)` メソッド存在確認
- [ ] `add(files)` メソッド存在確認（なければ実装）
- [ ] `commit(message)` メソッド存在確認（なければ実装）
- [ ] ファイル I/O が Node.js 環境を想定しているか確認

**必要な修正**:
```typescript
// GitService に以下を追加
async add(files: string[]): Promise<void>
async commit(message: string): Promise<void>
async getStatus(): Promise<string>
```

---

#### タスク 2.6.2: ConflictResolver 確認

**チェック項目**:
- [ ] `detectConflicts()` メソッド存在確認
- [ ] `getDiffInfo(filePath)` メソッド存在確認（なければ実装）
- [ ] `resolveConflict(fileId, strategy)` メソッド存在確認（なければ実装）

**必要な修正**:
```typescript
// ConflictResolver に以下を追加
async getDiffInfo(filePath: string): Promise<any>
async resolveConflict(fileId: string, strategy: 'upstream' | 'local' | 'both'): Promise<void>
```

---

#### タスク 2.6.3: ConfigManager 確認

**チェック項目**:
- [ ] `loadConfig(path)` メソッド存在確認
- [ ] `validateConfig(config)` メソッド存在確認
- [ ] `saveConfig(path, config)` メソッド存在確認（なければ実装）

---

### 2.7 ビルド & 検証

#### タスク 2.7.1: 開発環境テスト

```bash
# 1. 依存関係インストール
npm install

# 2. 開発モード起動
npm run dev

# 期待動作:
# - Vite 開発サーバー起動（http://localhost:5173）
# - Electron ウィンドウ表示
# - DevTools 表示
# - ホットリロード動作

# 3. 基本的な IPC テスト
# - 設定ファイル読み込み確認
# - コンソール出力確認
```

**チェックリスト**:
- [ ] `npm install` 成功
- [ ] `npm run dev` でアプリ起動確認
- [ ] コンソールエラーなし
- [ ] DevTools で Electron 確認

---

#### タスク 2.7.2: 本番ビルドテスト

```bash
# 1. ビルド実行
npm run build:gui

# 期待動作:
# - dist/ ディレクトリ生成
# - release/ ディレクトリに実行可能ファイル生成

# 2. バイナリ実行テスト
./release/Upstream\ Merge\ Tool.app/Contents/MacOS/Upstream\ Merge\ Tool
# (macOS の場合)
```

**チェックリスト**:
- [ ] ビルド成功
- [ ] 実行可能ファイル生成確認
- [ ] GUI 起動確認

---

## 3. 依存関係一覧

```json
{
  "dependencies": {
    "electron-squirrel-startup": "^1.1.0"
  },
  "devDependencies": {
    "@types/node": "^latest",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "@vitejs/plugin-react": "^latest",
    "autoprefixer": "^latest",
    "concurrently": "^latest",
    "electron": "^latest",
    "electron-builder": "^latest",
    "electron-dev": "^latest",
    "electron-is-dev": "^latest",
    "postcss": "^latest",
    "react": "^18",
    "react-dom": "^18",
    "react-router-dom": "^6",
    "tailwindcss": "^latest",
    "ts-loader": "^latest",
    "typescript": "^5",
    "vite": "^latest",
    "webpack": "^latest",
    "lucide-react": "^latest"
  }
}
```

---

## 4. ディレクトリ作成リスト

```
mkdir -p src/electron/ipc
mkdir -p src/renderer/components
mkdir -p src/renderer/pages
mkdir -p src/renderer/hooks
mkdir -p src/renderer/styles
mkdir -p src/shared/types
mkdir -p src/shared/utils
mkdir -p public
```

---

## 5. 実装順序（推奨）

1. **2.1** - パッケージング設定
2. **2.2** - Electron 基本構造
3. **2.3** - IPC ハンドラー
4. **2.4** - 型定義
5. **2.5** - React 基礎
6. **2.6** - 既存コード調査・修正
7. **2.7** - テスト・検証

---

## 6. チェックポイント

Phase 1 完了の条件:

- [ ] `npm start` で GUI 起動可能
- [ ] `npm run start:cli` で CLI 起動可能
- [ ] 開発サーバーで ホットリロード動作
- [ ] IPC 通信エラーなし
- [ ] ビルド成功
- [ ] 本番バイナリ実行確認

---

## 7. 次フェーズへの引き継ぎ

Phase 1 完了後、Phase 2 で以下を実装:
- 設定ページ UI
- マージページ UI
- 競合解決ページ UI
- レポートページ UI
- スタイリング・テーマ

---

## 8. 関連ドキュメント

- 提案書: `docs/09_improvements/20251019_01_gui-implementation-proposal.md`
- 既存アーキテクチャ: `docs/03_design/architecture/upstream-merge-tool-architecture.md`
