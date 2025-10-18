# Upstream自動マージツール アーキテクチャ設計書

**作成日**: 2025-10-19  
**最終更新日**: 2025-10-19  
**版**: 1.0

---

## 1. アーキテクチャ概要

### 1.1 システム構成図

```
┌─────────────────────────────────────────────────┐
│         CLI Entry Point (main.ts)               │
│  - コマンドライン解析                           │
│  - メイン処理フロー制御                         │
└────────────────────┬────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Config     │ │  Git         │ │  Conflict    │
│   Manager    │ │  Service     │ │  Resolver    │
│              │ │              │ │              │
│ - 読み込み   │ │ - fetch      │ │ - 検出       │
│ - 検証       │ │ - merge      │ │ - 判定       │
│ - パース     │ │ - status     │ │ - 解決       │
│ - デフォルト │ │ - show       │ │ - ステージ   │
└──────────────┘ └──────────────┘ └──────────────┘
        │            │            │
        └────────────┼────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
    ┌──────────────┐      ┌──────────────┐
    │  Report      │      │  Logger      │
    │  Generator   │      │  Service     │
    │              │      │              │
    │ - サマリー   │      │ - ファイル   │
    │ - 統計       │      │ - 標準出力   │
    │              │      │ - デバッグ   │
    └──────────────┘      └──────────────┘
```

### 1.2 システム全体フロー

```
START
  │
  ├─→ Config読み込み & 検証
  │    └─→ config.json 解析
  │    └─→ 必須項目チェック
  │    └─→ エラー時: 終了
  │
  ├─→ Git初期化 & 状態確認
  │    └─→ Gitリポジトリ確認
  │    └─→ git fetch 実行
  │
  ├─→ git merge 実行
  │    ├─→ コンフリクトなし: 成功メッセージ表示 → END
  │    └─→ コンフリクトあり: 次へ
  │
  ├─→ コンフリクト検出 & 解析
  │    ├─→ コンフリクトファイルリスト作成
  │    └─→ 各ファイルのコンフリクト箇所抽出
  │
  ├─→ 条件判定 & 自動解決
  │    ├─→ 各コンフリクトに対して:
  │    │   ├─→ 条件1: コンフリクト発生確認
  │    │   ├─→ 条件2: Upstream側変更確認
  │    │   ├─→ 条件3: マーカー検証
  │    │   │   ├─→ 全て満たす: 自動解決 & git add
  │    │   │   └─→ 1つ以上満たさない: 手動解決待ち
  │
  ├─→ レポート & ログ生成
  │    ├─→ CLI サマリー表示
  │    └─→ ログファイル生成
  │
  └─→ END
```

---

## 2. モジュール設計

### 2.1 モジュール一覧

| モジュール名 | 責務 | 依存関係 |
|-------------|------|---------|
| `main.ts` | メイン処理フロー制御 | ConfigManager, GitService, ConflictResolver, ReportGenerator, Logger |
| `config/ConfigManager.ts` | 設定ファイル管理 | Logger |
| `git/GitService.ts` | Git操作の実行 | Logger |
| `conflict/ConflictResolver.ts` | コンフリクト自動解決 | Logger |
| `report/ReportGenerator.ts` | レポート・ログ生成 | Logger |
| `logger/Logger.ts` | ログ出力管理 | (なし) |
| `utils/FileUtil.ts` | ファイル操作ユーティリティ | Logger |
| `utils/GitUtil.ts` | Git関連ユーティリティ | Logger |

### 2.2 各モジュールの詳細設計

#### 2.2.1 ConfigManager

**責務**: 設定ファイルの読み込み、検証、パース

```typescript
interface IConfigManager {
  loadConfig(configPath: string): Promise<Config>;
  validateConfig(config: Partial<Config>): ValidationResult;
}

interface Config {
  upstream_repository_name: string;
  upstream_branch_name: string;
  last_merged_upstream_commit: string;
  custom_code_marker: {
    start: string;
    end: string;
  };
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
```

**メソッド**:
- `loadConfig(configPath: string): Promise<Config>` - 設定ファイル読み込み
- `validateConfig(config: Partial<Config>): ValidationResult` - 設定検証
- `getDefaultConfigPath(): string` - デフォルト設定ファイルパス取得

**エラー処理**:
- ファイル存在チェック
- JSON形式検証
- 必須項目チェック
- コミットハッシュ形式検証

---

#### 2.2.2 GitService

**責務**: Git操作の実行と結果の取得

```typescript
interface IGitService {
  fetch(remoteName: string): Promise<void>;
  merge(remoteName: string, branchName: string): Promise<MergeResult>;
  getStatus(): Promise<GitStatus>;
  getConflictFiles(): Promise<string[]>;
  add(filePath: string): Promise<void>;
  getCommitHash(ref: string): Promise<string>;
  getDiff(fromCommit: string, toCommit: string, filePath: string): Promise<string>;
}

interface MergeResult {
  success: boolean;
  conflictFiles: string[];
  error?: string;
}

interface GitStatus {
  isRepository: boolean;
  isDirty: boolean;
  branch: string;
}
```

**メソッド**:
- `fetch(remoteName: string): Promise<void>` - リモート更新
- `merge(remoteName: string, branchName: string): Promise<MergeResult>` - マージ実行
- `getStatus(): Promise<GitStatus>` - リポジトリ状態取得
- `getConflictFiles(): Promise<string[]>` - コンフリクトファイルリスト取得
- `add(filePath: string): Promise<void>` - ステージング
- `getCommitHash(ref: string): Promise<string>` - コミットハッシュ取得
- `getDiff(fromCommit: string, toCommit: string, filePath: string): Promise<string>` - 差分取得

**エラー処理**:
- Gitコマンド実行失敗
- 無効なリモート/ブランチ指定

---

#### 2.2.3 ConflictResolver

**責務**: コンフリクト検出と自動解決判定・実行

```typescript
interface IConflictResolver {
  resolveConflicts(
    conflictFiles: string[],
    config: Config,
    lastMergedCommit: string,
    currentCommit: string
  ): Promise<ResolutionResult>;
}

interface ConflictMarker {
  startLine: number;
  endLine: number;
  oursStart: number;
  oursEnd: number;
  theirsStart: number;
  theirsEnd: number;
}

interface ConflictSection {
  markers: ConflictMarker[];
  content: string;
  isMarkedAsCustom: boolean;
}

interface ResolutionResult {
  autoResolved: string[];
  manualRequired: string[];
  details: ResolutionDetail[];
}

interface ResolutionDetail {
  filePath: string;
  status: 'auto-resolved' | 'manual-required';
  reason?: string;
  conditions?: {
    condition1: boolean; // コンフリクト発生
    condition2: boolean; // Upstream側変更なし
    condition3: boolean; // マーカーで囲まれている
  };
}
```

**メソッド**:
- `resolveConflicts(...)`: Promise<ResolutionResult>` - コンフリクト解決メイン処理
- `detectConflicts(filePath: string): Promise<ConflictMarker[]>` - コンフリクト検出
- `checkUpstreamChanges(filePath: string, fromCommit: string, toCommit: string): Promise<boolean>` - Upstream側の変更確認
- `isMarkedAsCustom(conflictContent: string, startMarker: string, endMarker: string): boolean` - マーカー検証
- `resolveConflictSection(content: string, marker: ConflictMarker): string` - コンフリクト解決

**条件判定ロジック**:
```typescript
// 3つの条件をすべて満たすか判定
const canAutoResolve = 
  condition1_hasConflict &&
  condition2_upstreamNoChange &&
  condition3_markedAsCustom;
```

---

#### 2.2.4 ReportGenerator

**責務**: 処理結果のレポート生成と表示

```typescript
interface IReportGenerator {
  generateReport(result: ResolutionResult, config: Config): Promise<void>;
  generateCLISummary(result: ResolutionResult): string;
  generateLogFile(result: ResolutionResult, logs: LogEntry[]): Promise<string>;
}

interface LogEntry {
  timestamp: Date;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  context?: Record<string, any>;
}

interface ReportData {
  executionTime: Date;
  upstreamRepository: string;
  upstreamBranch: string;
  autoResolvedCount: number;
  manualRequiredCount: number;
  totalConflictCount: number;
  autoResolvedFiles: string[];
  manualRequiredFiles: string[];
}
```

**メソッド**:
- `generateReport(result: ResolutionResult, config: Config): Promise<void>` - 完全レポート生成
- `generateCLISummary(result: ResolutionResult): string` - CLI出力用サマリー生成
- `generateLogFile(result: ResolutionResult, logs: LogEntry[]): Promise<string>` - ログファイル生成

**出力形式**:
- CLI: 標準出力
- ログファイル: `merge-report-YYYYMMDD-HHMMSS.log`

---

#### 2.2.5 Logger

**責務**: ログ出力の管理と記録

```typescript
interface ILogger {
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, context?: Record<string, any>): void;
  debug(message: string, context?: Record<string, any>): void;
  getLogs(): LogEntry[];
}

interface LogEntry {
  timestamp: Date;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  context?: Record<string, any>;
}
```

**メソッド**:
- `info(message: string, context?: object): void` - 情報ログ
- `warn(message: string, context?: object): void` - 警告ログ
- `error(message: string, context?: object): void` - エラーログ
- `debug(message: string, context?: object): void` - デバッグログ
- `getLogs(): LogEntry[]` - 全ログ取得

---

### 2.3 ファイル構成

```
scripts/upstream-merge-tool/
├── main.ts                          # エントリーポイント
├── config/
│   └── ConfigManager.ts             # 設定管理
├── git/
│   ├── GitService.ts                # Git操作
│   └── types.ts                     # Git関連の型定義
├── conflict/
│   ├── ConflictResolver.ts          # コンフリクト解決
│   └── types.ts                     # コンフリクト関連の型定義
├── report/
│   └── ReportGenerator.ts           # レポート生成
├── logger/
│   └── Logger.ts                    # ログ管理
├── utils/
│   ├── FileUtil.ts                  # ファイル操作
│   ├── GitUtil.ts                   # Git関連ユーティリティ
│   ├── StringUtil.ts                # 文字列操作
│   └── ErrorHandler.ts              # エラー処理
└── types/
    └── common.ts                    # 共通型定義
```

---

## 3. データフロー設計

### 3.1 設定読み込みフロー

```
main.ts
  ↓
  ConfigManager.loadConfig(configPath)
    ↓
    ├─→ ファイル存在確認
    ├─→ ファイル読み込み
    ├─→ JSON パース
    ├─→ スキーマ検証
    └─→ Config オブジェクト返却
      ↓
    Logger (各ステップでログ記録)
```

### 3.2 Git操作フロー

```
main.ts
  ↓
  GitService.fetch()
    ├─→ git fetch [upstream_repository_name]
    └─→ ログ記録
  ↓
  GitService.merge()
    ├─→ git merge [upstream]/[branch]
    ├─→ MergeResult 返却
    │   ├─→ success: true → 終了
    │   └─→ success: false & conflicts: [...] → ConflictResolver へ
    └─→ ログ記録
```

### 3.3 コンフリクト解決フロー

```
ConflictResolver.resolveConflicts()
  ↓
  for each conflictFile in conflictFiles:
    ↓
    ├─→ ファイルを読み込み
    ├─→ ConflictMarker 検出
    │
    ├─→ for each marker:
    │   ├─→ 条件1: マーカー存在確認 ✓
    │   ├─→ 条件2: GitService.getDiff() → Upstream側の変更確認
    │   ├─→ 条件3: マーカー検証
    │   │
    │   ├─→ 全て✓: 
    │   │   ├─→ ファイル内容修正（独自側のみ残す）
    │   │   ├─→ GitService.add(file)
    │   │   └─→ autoResolved リストに追加
    │   │
    │   └─→ 1つ以上✗:
    │       └─→ manualRequired リストに追加
    │
    └─→ ResolutionResult 返却
```

### 3.4 レポート生成フロー

```
ReportGenerator.generateReport()
  ↓
  ├─→ CLI サマリー生成
  │   └─→ 標準出力に表示
  │
  └─→ ログファイル生成
      ├─→ Logger から全ログ取得
      ├─→ ファイル名生成 (merge-report-YYYYMMDD-HHMMSS.log)
      ├─→ ファイル書き込み
      └─→ ファイルパス返却
```

---

## 4. エラーハンドリング設計

### 4.1 エラーの分類

| エラー型 | 対応 | ログレベル |
|---------|------|-----------|
| ファイル系エラー | エラーメッセージ表示 → 中断 | ERROR |
| Git系エラー | エラーメッセージ表示 → 中断 | ERROR |
| 設定検証エラー | 詳細なエラー内容表示 → 中断 | ERROR |
| 予期しない例外 | スタックトレース記録 → 中断 | ERROR |
| 警告レベルの問題 | 警告ログ → 処理継続 | WARN |

### 4.2 例外処理戦略

```typescript
try {
  // メイン処理
} catch (error) {
  if (error instanceof ConfigError) {
    // 設定エラー処理
    logger.error('Configuration error', { error });
  } else if (error instanceof GitError) {
    // Git操作エラー処理
    logger.error('Git operation failed', { error });
  } else if (error instanceof FileError) {
    // ファイル操作エラー処理
    logger.error('File operation failed', { error });
  } else {
    // 予期しない例外
    logger.error('Unexpected error', { error, stack: error.stack });
  }
  process.exit(1);
}
```

---

## 5. 拡張性・保守性設計

### 5.1 インターフェース設計による疎結合

各モジュール間は明確に定義されたインターフェースで通信し、実装の詳細に依存しない設計。

```typescript
// インターフェース定義
interface IGitService {
  fetch(remoteName: string): Promise<void>;
  merge(...): Promise<MergeResult>;
  // ...
}

// 実装
class GitService implements IGitService {
  async fetch(remoteName: string): Promise<void> {
    // 実装
  }
  // ...
}
```

### 5.2 設定による拡張性

リポジトリ名、ブランチ名、独自実装マーカーなどが、ソースコード修正なしに設定ファイルで変更可能。

### 5.3 ロギング機構による保守性

各モジュールは Logger を通じてログを記録し、問題発生時の追跡やデバッグが容易。

---

## 6. パフォーマンス設計

### 6.1 処理最適化

| 対象 | 最適化方法 |
|------|-----------|
| ファイル読み込み | ストリーム処理 / 大きなファイルはチャンク単位 |
| Git操作 | 必要な情報のみ取得（--name-only など） |
| コンフリクト検出 | 正規表現による高速検出 |
| ログ記録 | バッチ処理でファイルI/O削減 |

### 6.2 メモリ管理

- 大きなファイル：ストリーム処理
- ログ：ローカル保存前にメモリ制限設定
- 不要なオブジェクト：使用後即座に削除

---

## 7. セキュリティ設計

### 7.1 入力検証

- 設定ファイルのスキーマ検証
- ファイルパスのサニタイズ
- コマンドインジェクション対策

### 7.2 ファイルアクセス制御

- 読み込み権限確認
- 書き込み権限確認
- パス走査攻撃対策

---

## 8. 関連ドキュメント

- 要件定義書: `docs/02_requirements/features/upstream-merge-tool-requirements.md`
- 実装計画: `docs/04_implementation/plans/upstream-merge-tool/`
- テストケース: `docs/05_testing/test-cases/upstream-merge-tool-test-cases.md`

---

## 版履歴

| 版 | 更新日 | 更新内容 |
|----|--------|---------|
| 1.0 | 2025-10-19 | 初版作成。システム全体のアーキテクチャを設計 |
