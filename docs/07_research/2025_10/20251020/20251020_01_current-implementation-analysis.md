日付: 2025-11-19
実装者: AI Assistant
ステータス: 完了

# 現在の実装状況と GUI 改善案の詳細分析

## 1. 現在の実装状況

### 1.1 CLI ツールの設定構造

#### 現在の設定ファイル形式 (`src/types/config.ts`)

```typescript
interface Config {
  upstream_repository_name: string;           // Upstream リモート名
  upstream_branch_name: string;               // Upstream ブランチ名
  last_merged_upstream_commit: string;        // 前回マージコミット (SHA-1 40文字)
  last_merged_upstream_version?: string;      // オプション：バージョン情報
  upstream_version_tracking?: {               // オプション：バージョン追跡設定
    enabled: boolean;
    type?: 'tag' | 'package' | 'manual';
    value?: string;
  };
  custom_code_marker: {                       // 独自実装部分マーカー
    start: string;
    end: string;
  };
}
```

**現在の制限事項**:
- マージ先ブランチ情報がない（常に現在のブランチにマージ）
- ローカルリポジトリのパス情報がない（常に CWD を使用）
- 複数設定の管理ができない

### 1.2 GUI 実装の現状 (Electron + React)

#### ファイル構成

```
src/renderer/
├── App.tsx                          # ルートコンポーネント（ルーティング管理）
├── pages/
│   ├── ConfigPage.tsx               # 設定ページ（フォーム入力）
│   ├── MergePage.tsx                # マージ実行ページ
│   ├── ConflictPage.tsx             # 競合解決ページ
│   └── ReportPage.tsx               # レポート表示ページ
├── components/
│   ├── ConfigForm.tsx               # 設定フォーム（現在の実装）
│   ├── MergeOptions.tsx             # マージオプション
│   ├── MergeProgress.tsx            # 進捗表示
│   ├── StatusBar.tsx                # ステータスバー
│   └── StepNavigator.tsx            # ステップナビゲーション
└── ...
```

#### 現在の ConfigForm.tsx の特徴

**ファイル選択ベースの実装**:
- ファイル選択ダイアログでローカルの JSON ファイルを選択
- デフォルト設定として 1 つのファイルパスを保存可能
- ユーザー設定ディレクトリ: `~/.config/upstream-merge-tool/settings/`

**主な機能**:
- ファイルの選択・読み込み
- JSON の直接編集（テキストエリア）
- バリデーション
- デフォルト設定の管理

**問題点**:
- 複数設定（プリセット）の管理ができない
- UI が機械的で、設定の意図が不明確
- ファイル選択による手間
- JSON 直編集による操作の複雑さ

### 1.3 IPC 通信構造

#### 現在の設定関連 IPC ハンドラー (`src/electron/ipc/configHandlers.ts`)

```typescript
// 利用可能な IPC メソッド
ipcMain.handle('config:load', async (_event, configPath: string))
ipcMain.handle('config:save', async (_event, configPath: string, config: ConfigType))
ipcMain.handle('config:validate', async (_event, config: Partial<ConfigType>))
ipcMain.handle('config:setDefaultPath', async (_event, configPath: string))
ipcMain.handle('config:getDefaultPath', async (_event))
ipcMain.handle('config:clearDefault', async (_event))
```

**保存場所**:
- ユーザーデータディレクトリ: `app.getPath('userData')/settings/`
- 複数ファイルの保存に対応可能

### 1.4 現在の要件との乖離

| 機能 | CLI 要件 | 現在の GUI | 改善後の目標 |
|------|---------|----------|----------|
| ローカルリポジトリパス | × | × | ✅ |
| マージ先ブランチ | × | × | ✅ |
| 複数設定管理 | × | × | ✅ |
| Upstream 設定 | ✅ | ✅ | ✅ |
| バージョン追跡 | ✅ | ✅ | ✅ |
| 独自コードマーカー | ✅ | ✅ | ✅ |

---

## 2. 提案される改善案の詳細

### 2.1 拡張設定構造

#### 新しい IPC 型定義

```typescript
// src/shared/types/ipc.ts に追加

// プリセット管理用
export type ConfigPreset = {
  id: string;                          // UUID
  name: string;                        // プリセット名（ユーザー入力）
  description?: string;                // 説明
  createdAt: number;                   // 作成タイムスタンプ
  updatedAt: number;                   // 更新タイムスタンプ
  config: UpstreamConfig & LocalConfig; // 設定内容
};

// Upstream 設定
export type UpstreamConfig = {
  upstream_repository_name: string;           // リモート名（例: "upstream"）
  upstream_branch_name: string;               // ブランチ名（例: "main"）
  upstream_version_tracking?: {
    enabled: boolean;
    type?: 'tag' | 'package' | 'manual';
    value?: string;
  };
};

// ローカル設定
export type LocalConfig = {
  local_repository_path: string;              // ローカルリポジトリパス（絶対パス）
  merge_target_branch: string;                // マージ先ブランチ（例: "main"）
  last_merged_upstream_commit?: string;       // 前回マージコミット
  last_merged_upstream_version?: string;      // 前回マージバージョン
};

// カスタムコード保護設定
export type CustomCodeConfig = {
  custom_code_marker: {
    start: string;                            // 開始マーカー
    end: string;                              // 終了マーカー
  };
};

// 全体設定型
export type PresetConfigType = ConfigPreset['config'] & CustomCodeConfig;
```

#### フォーム構造の再設計

**2 つのセクション**に分割:

1. **Upstream 情報フォーム** (`UpstreamConfigForm.tsx`)
   - Upstream リモート名
   - Upstream ブランチ名
   - バージョン情報（複数の同期方法）
   - 前回マージ時のコミット/バージョン表示（参考情報）

2. **ローカル設定フォーム** (`LocalConfigForm.tsx`)
   - ローカルリポジトリパス（ディレクトリ選択）
   - マージ先ブランチ
   - 独自実装マーカー（開始/終了）

### 2.2 プリセット管理システム

#### プリセット管理用 IPC ハンドラー追加

```typescript
// src/electron/ipc/presetHandlers.ts（新規）

// プリセット一覧取得
ipcMain.handle('preset:list', async (_event))
  → Promise<ConfigPreset[]>

// プリセット保存（新規作成・上書き）
ipcMain.handle('preset:save', async (_event, preset: ConfigPreset))
  → Promise<{ id: string; success: boolean }>

// プリセット削除
ipcMain.handle('preset:delete', async (_event, presetId: string))
  → Promise<boolean>

// プリセット読み込み
ipcMain.handle('preset:load', async (_event, presetId: string))
  → Promise<ConfigPreset>

// デフォルトプリセット設定
ipcMain.handle('preset:setDefault', async (_event, presetId: string))
  → Promise<boolean>

// デフォルトプリセット取得
ipcMain.handle('preset:getDefault', async (_event))
  → Promise<ConfigPreset | null>

// プリセット名編集
ipcMain.handle('preset:rename', async (_event, presetId: string, newName: string))
  → Promise<boolean>
```

#### プリセット保存先

```
~/.config/upstream-merge-tool/
├── presets/
│   ├── preset_uuid1.json      # プリセット 1
│   ├── preset_uuid2.json      # プリセット 2
│   └── preset_uuid3.json      # プリセット 3
├── settings.json              # アプリ全体設定
│   {
│     "defaultPresetId": "uuid1",
│     "theme": "auto",
│     "language": "ja"
│   }
└── metadata.json              # プリセット メタデータ
    [
      { "id": "uuid1", "name": "プロジェクト A", "createdAt": 1234567890 },
      { "id": "uuid2", "name": "プロジェクト B", "createdAt": 1234567891 }
    ]
```

### 2.3 GUI フローの改善

#### 新しいワークフロー

```
アプリ起動
  ↓
[デフォルトプリセット確認]
  ├─ 存在する場合
  │   ↓
  │ 設定ページに自動読み込み
  │   ↓
  │ 設定を確認して次へ進むか、別のプリセット選択
  │
  └─ 存在しない場合
      ↓
    プリセット選択画面を表示
      ├─ 既存プリセットから選択
      ├─ 新規作成
      └─ ファイルからインポート
        ↓
      設定ページ
        ↓
      マージページ
        ↓
      （競合解決ページ）
        ↓
      レポートページ
```

### 2.4 改善後の ConfigPage 構成

#### ページレイアウト（複数タブ形式）

```
┌────────────────────────────────────────────────┐
│ 設定                                            │
├────────────────────────────────────────────────┤
│ [プリセット] [Upstream 情報] [ローカル設定]    │
├────────────────────────────────────────────────┤
│                                                │
│ ┌──────────────────────────────────────────┐  │
│ │ アクティブなタブのコンテンツ             │  │
│ │                                          │  │
│ └──────────────────────────────────────────┘  │
│                                                │
│ [キャンセル] [保存] [次へ進む]                 │
└────────────────────────────────────────────────┘
```

#### タブ 1: プリセット管理タブ

**主な機能**:
- プリセット一覧表示（テーブル）
  - プリセット名
  - 説明
  - 最終更新日
  - 状態（デフォルト、最後に使用）
- プリセット操作
  - 新規作成
  - 選択/読み込み
  - 名前変更
  - デフォルト設定
  - 削除
- プリセットのインポート/エクスポート

#### タブ 2: Upstream 情報タブ

**フォームフィールド**:
```
リモート設定
├─ リモート名
│  ├─ ラベル: "Upstream リモート名"
│  ├─ 入力欄
│  ├─ プレースホルダー: "upstream"
│  └─ ヘルプ: "git remote -v で確認可能"
│
├─ ブランチ名
│  ├─ ラベル: "Upstream ブランチ名"
│  ├─ 入力欄
│  ├─ プレースホルダー: "main"
│  └─ ヘルプ: "git branch -r で確認可能"
│
└─ バージョン追跡設定
   ├─ ラベル: "バージョン追跡"
   ├─ 有効/無効切り替え
   ├─ 追跡方法（ラジオボタン）
   │  ├─ Git タグから自動検出
   │  ├─ package.json から取得
   │  └─ 手動指定
   └─ 方法別の設定フィールド

最終マージ情報（参考表示のみ）
├─ 最終マージコミット: [読み取り専用表示]
└─ 最終マージバージョン: [読み取り専用表示]
```

#### タブ 3: ローカル設定タブ

**フォームフィールド**:
```
ローカルリポジトリ
├─ リポジトリパス
│  ├─ ラベル: "ローカルリポジトリパス"
│  ├─ 入力欄（または表示のみ）
│  ├─ [ディレクトリ選択ボタン]
│  └─ ヘルプ: ".git ディレクトリが存在するパス"
│
├─ マージ先ブランチ
│  ├─ ラベル: "マージ先ブランチ"
│  ├─ 入力欄
│  ├─ プレースホルダー: "main"
│  └─ ヘルプ: "現在のブランチまたは指定ブランチにマージされます"
│
└─ 独自実装部分の保護設定
   ├─ 開始マーカー
   │  ├─ ラベル: "カスタムコード開始マーカー"
   │  ├─ 入力欄
   │  ├─ プレースホルダー: "## BEGIN CUSTOM CODE SECTION"
   │  └─ ヘルプ: "この行とコード保護終了マーカーの間が保護されます"
   │
   └─ 終了マーカー
      ├─ ラベル: "カスタムコード終了マーカー"
      ├─ 入力欄
      ├─ プレースホルダー: "## END CUSTOM CODE SECTION"
      └─ ヘルプ: "カスタムコード保護区間の終了マーカー"

検証結果表示
├─ 設定の妥当性チェック結果
├─ パス存在確認
└─ Git リポジトリ存在確認
```

### 2.5 自動設定ファイル生成

#### デフォルト設定ファイルの自動作成・管理

**実装方針**:
- アプリ起動時、ユーザー設定ディレクトリが存在しない場合は自動作成
- プリセット作成時、JSON ファイルを自動生成
- ローカルに JSON ファイルを保存し、常に参照可能

**ファイル構成例**:
```
~/.config/upstream-merge-tool/
├── presets/
│   ├── default-project.json
│   ├── side-project.json
│   └── experimental.json
├── settings.json
└── metadata.json
```

---

## 3. 実装時の依存関係

### 3.1 既存モジュールの再利用

- `src/config/ConfigManager.ts`: バリデーションロジック
  - 拡張: `UpstreamConfig`, `LocalConfig` の検証を追加
  
- `src/git/GitService.ts`: Git 操作
  - 新機能: ローカルリポジトリパスの指定対応
  - 新機能: マージ先ブランチの指定対応

- `src/logger/Logger.ts`: ログ出力
  - 利用: プリセット操作のログ記録

### 3.2 新規実装が必要なモジュール

- `src/electron/ipc/presetHandlers.ts`: プリセット IPC
- `src/config/PresetManager.ts`: プリセット管理ロジック
- `src/renderer/components/UpstreamConfigForm.tsx`: Upstream フォーム
- `src/renderer/components/LocalConfigForm.tsx`: ローカル設定フォーム
- `src/renderer/components/PresetSelector.tsx`: プリセット選択
- `src/renderer/hooks/usePresets.ts`: プリセット操作フック

### 3.3 型定義の拡張

- `src/shared/types/ipc.ts`: 新型定義追加
  - `ConfigPreset`
  - `UpstreamConfig`
  - `LocalConfig`
  - `CustomCodeConfig`
  - `PresetConfigType`

---

## 4. マイグレーション戦略

### 4.1 既存設定との互換性

**現在の形式から新形式への変換**:
```typescript
// 旧形式
{
  "upstream_repository_name": "upstream",
  "upstream_branch_name": "main",
  "last_merged_upstream_commit": "abc123...",
  "custom_code_marker": { ... }
}

// 新形式（互換モード）
{
  "id": "uuid-generated",
  "name": "Imported Config",
  "config": {
    "upstream_repository_name": "upstream",
    "upstream_branch_name": "main",
    "local_repository_path": "/path/to/repo",  // ユーザーが入力
    "merge_target_branch": "main",
    "last_merged_upstream_commit": "abc123...",
    "custom_code_marker": { ... }
  }
}
```

**既存ファイルの自動検出・インポート**:
- アプリ起動時、CWD に `config.json` が存在する場合、インポート提案
- ユーザー確認後、プリセットとして保存

---

## 5. UI コンポーネント設計

### 5.1 新規コンポーネント一覧

| コンポーネント名 | 用途 | 親コンポーネント |
|--------|------|---------|
| `PresetManager` | プリセット管理 UI | ConfigPage |
| `UpstreamConfigForm` | Upstream 設定フォーム | ConfigPage |
| `LocalConfigForm` | ローカル設定フォーム | ConfigPage |
| `PresetSelector` | プリセット一覧・選択 | PresetManager |
| `PresetEditor` | プリセット作成・編集 | PresetManager |
| `DirectoryPicker` | ディレクトリ選択 | LocalConfigForm |
| `ConfigValidator` | 設定検証結果表示 | ConfigPage |

### 5.2 状態管理

**Context API を利用**:
```typescript
// PresetContext
{
  presets: ConfigPreset[];
  selectedPreset: ConfigPreset | null;
  defaultPreset: ConfigPreset | null;
  isLoading: boolean;
  error: string | null;
  
  methods: {
    loadPresets(): Promise<void>;
    savePreset(preset: ConfigPreset): Promise<void>;
    deletePreset(id: string): Promise<void>;
    selectPreset(id: string): Promise<void>;
    setDefault(id: string): Promise<void>;
  }
}
```

---

## 6. データフロー

### 6.1 プリセット読み込みフロー

```
[ConfigPage 初期化]
  ↓
[presetContext.loadPresets()]
  ↓
[IPC: preset:list]
  ↓
[Electron: プリセット一覧読み込み]
  ↓
[プリセット一覧表示]
  ↓
[ユーザー選択 or デフォルト自動選択]
  ↓
[IPC: preset:load]
  ↓
[フォーム自動入力]
```

### 6.2 プリセット保存フロー

```
[フォーム入力完了]
  ↓
[バリデーション実行]
  ↓
バリデーション成功
  ↓
[保存ボタンクリック]
  ↓
[IPC: preset:save]
  ↓
[Electron: プリセット JSON 生成・保存]
  ↓
[メタデータ更新]
  ↓
[成功メッセージ表示]
```

---

## 7. セキュリティとデータ保護

### 7.1 パス検証

- ローカルリポジトリパス: `.git` ディレクトリ存在確認
- パストラバーサル対策: パス正規化と許可リスト管理

### 7.2 設定ファイルの保護

- ユーザー設定ディレクトリ: 所有者のみ読み取り可能（`0700`）
- プリセット JSON: 機密情報なし（パスは相対参照可能）

### 7.3 入力検証

- リモート名、ブランチ名: 英数字・ハイフン・スラッシュのみ許可
- マーカー文字列: 特殊文字チェック
- パス: 絶対パスのみ許可（Windows 対応）

---

## 8. テスト戦略

### 8.1 ユニットテスト

- `PresetManager` のプリセット操作テスト
- `ConfigValidator` の検証ロジックテスト
- IPC ハンドラーのユニットテスト

### 8.2 統合テスト

- プリセット作成→読み込み→削除の一連操作
- 複数プリセット間の切り替え
- インポート・エクスポート機能

### 8.3 E2E テスト

- GUI からのプリセット作成・読み込み・マージ実行
- デフォルトプリセットの自動読み込み
- エラーケース（パス不存在など）

---

## 9. 今後の拡張可能性

### 9.1 プリセットの共有機能

- プリセット JSON のエクスポート
- 他ユーザーのプリセット JSON のインポート

### 9.2 プリセットテンプレート

- よく使われる設定をテンプレートとして提供

### 9.3 設定バージョン管理

- プリセット変更履歴の保存
- 過去の設定への復元

---

## 関連ドキュメント

- 現在の要件: `docs/02_requirements/features/upstream-merge-tool-requirements.md`
- GUI 実装提案: `docs/09_improvements/20251019_01_gui-implementation-proposal.md`
- 既存 CLI 実装: `docs/04_implementation/plans/upstream-merge-tool/`
