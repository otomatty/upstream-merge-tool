# Upstream自動マージツール 実装計画書

**作成日**: 2025-10-19  
**最終更新日**: 2025-10-19  
**版**: 1.0

---

## 1. 実装概要

### 1.1 実装フェーズ

本ツールの実装は、**3つのフェーズ** に分けて段階的に進める。

| フェーズ | 名称 | 期間 | 主要タスク |
|---------|------|------|----------|
| Phase 1 | コア機能実装 | Week 1-2 | 設定読み込み、Git操作、ログ機構 |
| Phase 2 | コンフリクト解決 | Week 2-3 | コンフリクト検出、条件判定、自動解決 |
| Phase 3 | レポート・ビルド | Week 3-4 | レポート生成、クロスプラットフォームビルド |

### 1.2 成果物

- TypeScript ソースコード（`scripts/upstream-merge-tool/`）
- 実行可能ファイル（macOS、Windows、Linux）
- ドキュメント（セットアップガイド、使用方法）

---

## 2. Phase 1: コア機能実装

### 目標

設定管理、Git操作の基盤を構築し、マージまでのフロー完成させる。

### 2.1 タスク一覧

#### T1.1: プロジェクト初期化と構造構築

**概要**: TypeScript プロジェクトの初期設定とディレクトリ構造を作成

**実装内容**:
- `tsconfig.json` 設定確認・調整
- ディレクトリ構造作成
  - `src/config/`
  - `src/git/`
  - `src/conflict/`
  - `src/report/`
  - `src/logger/`
  - `src/utils/`
  - `src/types/`
- `package.json` にビルドスクリプト追加

**成果物**:
- 整理されたディレクトリ構造
- 更新された `package.json`

**テスト方法**:
```bash
bun run ./src/main.ts --help
# 実行可能なことを確認
```

**完了条件**:
- [ ] ディレクトリ構造が作成される
- [ ] ビルドスクリプトが動作する

---

#### T1.2: Logger モジュールの実装

**概要**: ログ出力機構の基盤となるクラスを実装

**実装内容**:
```typescript
// src/logger/Logger.ts
interface LogEntry {
  timestamp: Date;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  context?: Record<string, any>;
}

class Logger {
  private logs: LogEntry[] = [];
  private isDevelopment = Bun.env.NODE_ENV === 'development';

  info(message: string, context?: Record<string, any>): void
  warn(message: string, context?: Record<string, any>): void
  error(message: string, context?: Record<string, any>): void
  debug(message: string, context?: Record<string, any>): void
  getLogs(): LogEntry[]
  formatLogEntry(entry: LogEntry): string
}
```

**成果物**:
- `Logger.ts` クラス
- ログ型定義

**テスト方法**:
```bash
# ログ出力テスト
logger.info('Test message', { key: 'value' });
console.log(logger.getLogs());
```

**完了条件**:
- [ ] Logger クラスが実装される
- [ ] 各ログレベルが正常に動作する

---

#### T1.3: ConfigManager モジュールの実装

**概要**: 設定ファイルの読み込みと検証

**実装内容**:
```typescript
// src/config/ConfigManager.ts
interface Config {
  upstream_repository_name: string;
  upstream_branch_name: string;
  last_merged_upstream_commit: string;
  custom_code_marker: {
    start: string;
    end: string;
  };
}

class ConfigManager {
  async loadConfig(configPath: string): Promise<Config>
  validateConfig(config: Partial<Config>): { isValid: boolean; errors: string[] }
  private validateCommitHash(hash: string): boolean
  private parseJson(content: string): any
}
```

**実装詳細**:
- ファイル存在確認
- JSON パース
- 必須項目チェック
- コミットハッシュ形式検証（40文字の16進数）

**成果物**:
- `ConfigManager.ts`
- `config/types.ts`

**テスト方法**:
```bash
# 正常な設定ファイル
bun run ./src/main.ts --config ./config.json

# エラーケース
# - ファイルなし
# - JSON形式エラー
# - 必須項目不足
```

**完了条件**:
- [ ] 正常な設定ファイルが読み込める
- [ ] 各種エラーが適切に検出される
- [ ] ログに詳細なメッセージが出力される

---

#### T1.4: GitService モジュールの実装

**概要**: Git操作を実行するサービス層

**実装内容**:
```typescript
// src/git/GitService.ts
interface MergeResult {
  success: boolean;
  conflictFiles: string[];
  error?: string;
}

class GitService {
  async fetch(remoteName: string): Promise<void>
  async merge(remoteName: string, branchName: string): Promise<MergeResult>
  async getStatus(): Promise<{ isRepository: boolean; isDirty: boolean; branch: string }>
  async getConflictFiles(): Promise<string[]>
  async add(filePath: string): Promise<void>
  async getCommitHash(ref: string): Promise<string>
  async getDiff(fromCommit: string, toCommit: string, filePath: string): Promise<string>
  private exec(command: string): Promise<{ stdout: string; stderr: string; exitCode: number }>
}
```

**実装詳細**:
- Bun の `$` シェル実行機能を使用
- 標準出力・標準エラー出力を捕捉
- 終了コードをチェック
- コマンド実行失敗時にエラーログ記録

**成果物**:
- `GitService.ts`
- `git/types.ts`

**テスト方法**:
```bash
# テストリポジトリでテスト実施
git init test-repo
cd test-repo
bun run ./src/main.ts --config ./test-config.json
```

**完了条件**:
- [ ] git fetch が正常に実行される
- [ ] git merge が実行され、成功/失敗を正しく判定する
- [ ] コンフリクトファイルが正しく検出される
- [ ] エラーハンドリングが正常に動作する

---

#### T1.5: メイン処理フロー（Phase 1版）の実装

**概要**: 各モジュールを統合し、メインフロー実装

**実装内容**:
```typescript
// src/main.ts
async function main() {
  const logger = new Logger();
  
  try {
    // 1. 設定読み込み
    const configManager = new ConfigManager(logger);
    const config = await configManager.loadConfig('./config.json');
    logger.info('Configuration loaded successfully');
    
    // 2. Git 初期化
    const gitService = new GitService(logger);
    const status = await gitService.getStatus();
    if (!status.isRepository) {
      throw new Error('Not in a git repository');
    }
    logger.info('Git repository verified');
    
    // 3. fetch 実行
    logger.info('Running git fetch...');
    await gitService.fetch(config.upstream_repository_name);
    logger.info('Git fetch completed');
    
    // 4. merge 実行
    logger.info('Running git merge...');
    const mergeResult = await gitService.merge(
      config.upstream_repository_name,
      config.upstream_branch_name
    );
    
    if (mergeResult.success) {
      logger.info('Merge completed successfully with no conflicts');
      process.exit(0);
    }
    
    logger.info(`Merge completed with ${mergeResult.conflictFiles.length} conflict files`);
    
  } catch (error) {
    logger.error('Unexpected error', { error });
    process.exit(1);
  }
}

main();
```

**成果物**:
- `main.ts`

**テスト方法**:
```bash
bun run ./src/main.ts
# コンソール出力を確認
```

**完了条件**:
- [ ] 設定ファイルが読み込まれる
- [ ] Git fetch が実行される
- [ ] Git merge が実行される
- [ ] エラー発生時の処理が正常に動作する

---

### 2.2 Phase 1 チェックリスト

- [ ] T1.1: プロジェクト初期化
- [ ] T1.2: Logger モジュール実装
- [ ] T1.3: ConfigManager モジュール実装
- [ ] T1.4: GitService モジュール実装
- [ ] T1.5: メイン処理フロー実装
- [ ] Phase 1 統合テスト実施

---

## 3. Phase 2: コンフリクト解決機能実装

### 目標

コンフリクト検出、条件判定、自動解決の機能を実装。

### 3.1 タスク一覧

#### T2.1: ConflictResolver モジュールの実装（Part 1: 検出）

**概要**: コンフリクトマーカーの検出機能

**実装内容**:
```typescript
// src/conflict/ConflictResolver.ts
interface ConflictMarker {
  startLine: number;
  markerLine: number;
  endLine: number;
  oursStart: number;
  oursEnd: number;
  theirsStart: number;
  theirsEnd: number;
  ours: string;
  theirs: string;
}

class ConflictResolver {
  async detectConflicts(filePath: string): Promise<ConflictMarker[]>
  private parseConflictMarkers(content: string): ConflictMarker[]
}
```

**実装詳細**:
- ファイルを行ごとに読み込み
- `<<<<<<<`、`=======`、`>>>>>>>` パターンを検出
- 各マーカーのLine番号を記録
- 前後の内容を保存

**テスト方法**:
```bash
# テスト用コンフリクトファイルを作成して確認
```

**完了条件**:
- [ ] 単一コンフリクト検出
- [ ] 複数コンフリクト検出
- [ ] 部分的なマーカーの対応チェック

---

#### T2.2: ConflictResolver モジュールの実装（Part 2: 条件判定）

**概要**: 3つの条件判定ロジック実装

**実装内容**:
```typescript
// src/conflict/ConflictResolver.ts
class ConflictResolver {
  // 条件1: コンフリクト発生確認（Part 1で実装済み）
  
  // 条件2: Upstream側の変更確認
  async checkUpstreamChanges(
    filePath: string,
    fromCommit: string,
    toCommit: string,
    gitService: IGitService
  ): Promise<boolean>
  
  // 条件3: マーカー検証
  isMarkedAsCustom(
    conflictContent: string,
    marker: ConflictMarker,
    startMarker: string,
    endMarker: string
  ): boolean
  
  // 統合判定
  canAutoResolve(
    condition1: boolean,
    condition2: boolean,
    condition3: boolean
  ): boolean
}
```

**実装詳細**:
- Condition 2: `git diff fromCommit toCommit -- filePath` で差分を確認
- Condition 3: コンフリクト部分の前後に独自実装マーカーがあるか確認

**テスト方法**:
```bash
# 各条件のテストケースを実施
```

**完了条件**:
- [ ] Upstream側の変更が正しく判定される
- [ ] マーカー検証が正しく動作する
- [ ] 3つ条件の AND 判定が正常に機能する

---

#### T2.3: ConflictResolver モジュールの実装（Part 3: 解決）

**概要**: コンフリクト自動解決処理

**実装内容**:
```typescript
// src/conflict/ConflictResolver.ts
class ConflictResolver {
  async resolveConflict(
    filePath: string,
    marker: ConflictMarker
  ): Promise<void>
  
  private removeConflictMarkers(
    content: string,
    marker: ConflictMarker
  ): string
}
```

**実装詳細**:
- ファイルの内容を読み込み
- コンフリクトマーカーを削除
- `<<<<<<<` から `=======` までの部分（自側）のみを残す
- ファイルに書き込み

**テスト方法**:
```bash
# コンフリクト解決後のファイル内容を確認
```

**完了条件**:
- [ ] コンフリクトマーカーが削除される
- [ ] 自側の変更が保持される
- [ ] ファイルの整合性が保持される

---

#### T2.4: メイン処理フロー（Phase 2版）の実装

**概要**: コンフリクト解決フローの統合

**実装内容**:
```typescript
// src/main.ts - 拡張版
async function main() {
  // Phase 1 のコード...
  
  if (mergeResult.success) {
    logger.info('Merge completed successfully');
    process.exit(0);
  }
  
  // Phase 2: コンフリクト自動解決
  logger.info(`Attempting to auto-resolve ${mergeResult.conflictFiles.length} conflicts...`);
  
  const conflictResolver = new ConflictResolver(logger);
  const resolutionResult = await conflictResolver.resolveConflicts(
    mergeResult.conflictFiles,
    config,
    gitService
  );
  
  logger.info(`Auto-resolved: ${resolutionResult.autoResolved.length}, Manual required: ${resolutionResult.manualRequired.length}`);
}
```

**成果物**:
- 更新された `main.ts`
- `ConflictResolver.ts` 完成版

**完了条件**:
- [ ] コンフリクトが自動解決される
- [ ] ステージング処理が正常に実行される
- [ ] 手動解決待ちリストが正しく生成される

---

### 3.2 Phase 2 チェックリスト

- [ ] T2.1: コンフリクト検出実装
- [ ] T2.2: 条件判定実装
- [ ] T2.3: コンフリクト解決実装
- [ ] T2.4: メイン処理フロー統合
- [ ] Phase 2 統合テスト実施

---

## 4. Phase 3: レポート・ビルド・デプロイ

### 目標

レポート生成機能の実装とクロスプラットフォームビルド。

### 4.1 タスク一覧

#### T3.1: ReportGenerator モジュールの実装

**概要**: レポート生成機能

**実装内容**:
```typescript
// src/report/ReportGenerator.ts
interface ReportData {
  executionTime: Date;
  autoResolvedCount: number;
  manualRequiredCount: number;
  totalConflictCount: number;
  autoResolvedFiles: string[];
  manualRequiredFiles: string[];
}

class ReportGenerator {
  generateCLISummary(data: ReportData): string
  async generateLogFile(data: ReportData, logs: LogEntry[]): Promise<string>
  private formatTimestamp(date: Date): string
}
```

**実装詳細**:
- CLI出力用サマリー文字列生成
- ログファイル生成（`merge-report-YYYYMMDD-HHMMSS.log`）
- ファイル書き込み

**テスト方法**:
```bash
# レポートが正しく生成されることを確認
```

**完了条件**:
- [ ] CLI出力が正しいフォーマットで表示される
- [ ] ログファイルが生成される
- [ ] ファイルパスが返却される

---

#### T3.2: メイン処理フロー（Phase 3版）の実装

**概要**: レポート生成の統合

**実装内容**:
```typescript
// src/main.ts - 最終版
async function main() {
  // Phase 1, 2 のコード...
  
  // Phase 3: レポート生成
  const reportGenerator = new ReportGenerator(logger);
  const reportPath = await reportGenerator.generateLogFile(
    resolutionResult,
    logger.getLogs()
  );
  
  const summary = reportGenerator.generateCLISummary(resolutionResult);
  console.log(summary);
}
```

**完了条件**:
- [ ] レポートが生成される
- [ ] CLIサマリーが表示される

---

#### T3.3: クロスプラットフォームビルド設定

**概要**: macOS、Windows、Linux 向けのビルド

**実装内容**:
```json
// package.json - 更新
{
  "scripts": {
    "build": "bun build ./src/main.ts --compile --outfile ./bin/merge-tool",
    "build:macos": "bun build ./src/main.ts --compile --outfile ./bin/merge-tool --target=bun-darwin-x64",
    "build:windows": "bun build ./src/main.ts --compile --outfile ./bin/merge-tool.exe --target=bun-windows-x64",
    "build:linux": "bun build ./src/main.ts --compile --outfile ./bin/merge-tool --target=bun-linux-x64",
    "build:all": "npm run build:macos && npm run build:windows && npm run build:linux"
  }
}
```

**実行手順**:
```bash
bun run build:all
```

**成果物**:
- `bin/merge-tool` (macOS/Linux)
- `bin/merge-tool.exe` (Windows)
- `bin/merge-tool` (Linux)

**完了条件**:
- [ ] 各OS向けビルドが成功する
- [ ] 実行可能ファイルが生成される

---

#### T3.4: ドキュメント整備

**概要**: ユーザー・開発者向けドキュメント作成

**成果物**:
- セットアップガイド
- 使用方法ガイド
- トラブルシューティング

**完了条件**:
- [ ] ユーザーガイドが完成する
- [ ] セットアップガイドが完成する

---

### 4.2 Phase 3 チェックリスト

- [ ] T3.1: ReportGenerator 実装
- [ ] T3.2: メイン処理フロー最終版実装
- [ ] T3.3: クロスプラットフォームビルド設定
- [ ] T3.4: ドキュメント整備
- [ ] Phase 3 統合テスト実施

---

## 5. リスク管理

### 5.1 技術的リスク

| リスク | 対応策 |
|--------|--------|
| Bun の互換性問題 | 早期にテスト、代替案を検討 |
| Git コマンド解析の複雑性 | テストケースを充実させる |
| クロスプラットフォーム対応 | 各OS で実機テストを実施 |
| パフォーマンス問題 | 大規模ファイルでのテストを実施 |

### 5.2 スケジュールリスク

| リスク | 対応策 |
|--------|--------|
| 予期しない技術課題 | バッファ時間（1週間）を確保 |
| テスト期間の延長 | テストスクリプトの自動化 |

---

## 6. 実装ガイドライン

### 6.1 コーディング規約

- TypeScript の型チェック有効
- ESLint による チェック
- コメントは英語で記述
- 関数は20行以下を目指す

### 6.2 テスト戦略

- ユニットテスト: 各モジュール単位
- 統合テスト: フェーズ完了時
- エンドツーエンドテスト: 全体完了時

### 6.3 Git運用

- コンベンショナルコミット形式
- フィーチャーブランチでの開発
- PR レビュー前にテスト実施

---

## 7. 実装進捗トラッキング

### 7.1 進捗確認ポイント

- Week 1: Phase 1 50% 完了
- Week 1 末: Phase 1 完了
- Week 2: Phase 2 70% 完了
- Week 2 末: Phase 2 完了
- Week 3: Phase 3 70% 完了
- Week 3 末: Phase 3 完了・全テスト実施
- Week 4: ドキュメント完成・最終調整

---

## 関連ドキュメント

- 要件定義書: `docs/02_requirements/features/upstream-merge-tool-requirements.md`
- アーキテクチャ設計書: `docs/03_design/architecture/upstream-merge-tool-architecture.md`
- テストケース: `docs/05_testing/test-cases/upstream-merge-tool-test-cases.md`

---

## 版履歴

| 版 | 更新日 | 更新内容 |
|----|--------|---------|
| 1.0 | 2025-10-19 | 初版作成。3フェーズの実装計画を定義 |
