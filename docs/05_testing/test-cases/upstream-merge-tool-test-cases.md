# Upstream自動マージツール テストケース

**作成日**: 2025-10-19  
**最終更新日**: 2025-10-19  
**版**: 1.0

---

## 1. テスト戦略

### 1.1 テスト体系

```
Unit Tests (ユニットテスト)
  ├─ Logger テスト
  ├─ ConfigManager テスト
  ├─ GitService テスト
  ├─ ConflictResolver テスト
  └─ ReportGenerator テスト

Integration Tests (統合テスト)
  ├─ Config読み込み → Git操作
  ├─ Git操作 → コンフリクト解決
  └─ コンフリクト解決 → レポート生成

E2E Tests (エンドツーエンドテスト)
  ├─ 正常系フロー（コンフリクトなし）
  ├─ 正常系フロー（自動解決可能なコンフリクト）
  ├─ 正常系フロー（手動解決が必要なコンフリクト）
  └─ エラーケース
```

### 1.2 テストフレームワーク

- **ユニット・統合テスト**: Bun の標準 `bun:test`
- **E2E テスト**: シェルスクリプト + テストリポジトリ

### 1.3 テスト実行方法

```bash
# 全テスト実行
bun test

# 特定のテストファイルを実行
bun test src/__tests__/unit/logger.test.ts

# テストカバレッジ表示
bun test --coverage
```

---

## 2. ユニットテスト

### 2.1 Logger テスト

**テストファイル**: `src/__tests__/unit/logger.test.ts`

| TC ID | テスト項目 | 入力 | 期待結果 | 優先度 |
|-------|-----------|------|---------|--------|
| TC-LOG-001 | info メソッド | message: "Test message" | ログレベル INFO のエントリが作成される | High |
| TC-LOG-002 | warn メソッド | message: "Warning" | ログレベル WARN のエントリが作成される | High |
| TC-LOG-003 | error メソッド | message: "Error" | ログレベル ERROR のエントリが作成される | High |
| TC-LOG-004 | debug メソッド | message: "Debug info" | ログレベル DEBUG のエントリが作成される | Medium |
| TC-LOG-005 | コンテキスト付きログ | context: { key: 'value' } | コンテキストがログエントリに保存される | High |
| TC-LOG-006 | ログ取得 | - | getLogs() が全ログエントリの配列を返す | High |
| TC-LOG-007 | ログエントリの形式 | - | 各ログエントリにタイムスタンプ、レベル、メッセージが含まれる | High |
| TC-LOG-008 | ログの順序 | 複数のログを記録 | ログが記録順に返される | Medium |

**テストコード例**:
```typescript
import { describe, it, expect } from 'bun:test';
import { Logger } from '../../logger/Logger';

describe('Logger', () => {
  it('should create an info log entry', () => {
    const logger = new Logger();
    logger.info('Test message');
    
    const logs = logger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].level).toBe('INFO');
    expect(logs[0].message).toBe('Test message');
  });

  it('should include context in log entry', () => {
    const logger = new Logger();
    const context = { userId: '123', action: 'test' };
    logger.info('User action', context);
    
    const logs = logger.getLogs();
    expect(logs[0].context).toEqual(context);
  });
});
```

---

### 2.2 ConfigManager テスト

**テストファイル**: `src/__tests__/unit/config-manager.test.ts`

| TC ID | テスト項目 | 入力 | 期待結果 | 優先度 |
|-------|-----------|------|---------|--------|
| TC-CFG-001 | 正常な設定ファイル読み込み | 有効な config.json | Config オブジェクトが返される | High |
| TC-CFG-002 | ファイル存在チェック | ファイルなし | ConfigError がスローされる | High |
| TC-CFG-003 | JSON形式検証 | 不正な JSON | JSON パースエラーがスローされる | High |
| TC-CFG-004 | 必須項目検証（upstream_repository_name） | 項目なし | バリデーションエラーが返される | High |
| TC-CFG-005 | 必須項目検証（upstream_branch_name） | 項目なし | バリデーションエラーが返される | High |
| TC-CFG-006 | 必須項目検証（last_merged_upstream_commit） | 項目なし | バリデーションエラーが返される | High |
| TC-CFG-007 | 必須項目検証（custom_code_marker） | 項目なし | バリデーションエラーが返される | High |
| TC-CFG-008 | コミットハッシュ形式検証 | 40文字の16進数 | 検証成功 | High |
| TC-CFG-009 | コミットハッシュ形式検証エラー | 39文字の16進数 | 警告ログが出力される | Medium |
| TC-CFG-010 | コミットハッシュ形式検証エラー | 40文字だが16進数でない | 警告ログが出力される | Medium |
| TC-CFG-011 | 設定値の返却 | 正常な config.json | 全設定値が正しく返される | High |

**テストコード例**:
```typescript
import { describe, it, expect } from 'bun:test';
import { ConfigManager } from '../../config/ConfigManager';
import fs from 'fs';
import path from 'path';

describe('ConfigManager', () => {
  it('should load a valid config file', async () => {
    const configManager = new ConfigManager(mockLogger);
    const config = await configManager.loadConfig('./test-config.json');
    
    expect(config.upstream_repository_name).toBe('upstream');
    expect(config.upstream_branch_name).toBe('main');
  });

  it('should throw error when config file does not exist', async () => {
    const configManager = new ConfigManager(mockLogger);
    
    expect(async () => {
      await configManager.loadConfig('./nonexistent.json');
    }).toThrow();
  });

  it('should validate commit hash format', () => {
    const configManager = new ConfigManager(mockLogger);
    const result = configManager.validateConfig({
      last_merged_upstream_commit: 'abc1234567890def'  // 16文字 (不正)
    });
    
    expect(result.isValid).toBe(false);
  });
});
```

---

### 2.3 GitService テスト

**テストファイル**: `src/__tests__/unit/git-service.test.ts`

| TC ID | テスト項目 | 入力 | 期待結果 | 優先度 |
|-------|-----------|------|---------|--------|
| TC-GIT-001 | fetch 成功 | 有効なリモート名 | エラーなく実行完了 | High |
| TC-GIT-002 | fetch 失敗（無効なリモート） | 無効なリモート名 | GitError がスローされる | High |
| TC-GIT-003 | merge 成功（コンフリクトなし） | 有効なリモート・ブランチ | MergeResult.success = true | High |
| TC-GIT-004 | merge 失敗（コンフリクトあり） | コンフリクト発生時 | MergeResult.success = false, conflictFiles 配列に値あり | High |
| TC-GIT-005 | コンフリクトファイルリスト取得 | マージ後 | コンフリクトファイルが正しくリストされる | High |
| TC-GIT-006 | git add 実行 | ファイルパス | ファイルがステージングされる | High |
| TC-GIT-007 | コミットハッシュ取得 | ref: "HEAD" | 40文字のコミットハッシュが返される | High |
| TC-GIT-008 | 差分取得 | 2つのコミットハッシュ、ファイルパス | 差分情報が返される | High |
| TC-GIT-009 | リポジトリ状態確認 | - | 現在のブランチ名が返される | High |

**テストコード例**:
```typescript
import { describe, it, expect } from 'bun:test';
import { GitService } from '../../git/GitService';

describe('GitService', () => {
  it('should execute git fetch successfully', async () => {
    const gitService = new GitService(mockLogger);
    
    // テストリポジトリでテスト
    expect(async () => {
      await gitService.fetch('origin');
    }).not.toThrow();
  });

  it('should detect merge conflicts', async () => {
    const gitService = new GitService(mockLogger);
    
    // コンフリクト発生時
    const result = await gitService.merge('upstream', 'main');
    
    expect(result.success).toBe(false);
    expect(result.conflictFiles.length).toBeGreaterThan(0);
  });
});
```

---

### 2.4 ConflictResolver テスト

**テストファイル**: `src/__tests__/unit/conflict-resolver.test.ts`

| TC ID | テスト項目 | 入力 | 期待結果 | 優先度 |
|-------|-----------|------|---------|--------|
| TC-CONF-001 | 単一コンフリクト検出 | コンフリクトファイル（1つの競合） | ConflictMarker 1個が検出される | High |
| TC-CONF-002 | 複数コンフリクト検出 | コンフリクトファイル（複数の競合） | ConflictMarker が複数個検出される | High |
| TC-CONF-003 | Upstream側変更なし判定（真） | Upstream側に変更がないファイル | true が返される | High |
| TC-CONF-004 | Upstream側変更あり判定（偽） | Upstream側に変更があるファイル | false が返される | High |
| TC-CONF-005 | マーカー検証（完全に囲まれている） | // CUSTOM-CODE-START ～ // CUSTOM-CODE-END | true が返される | High |
| TC-CONF-006 | マーカー検証（開始マーカーのみ） | 開始マーカーのみ | false が返される | High |
| TC-CONF-007 | マーカー検証（終了マーカーのみ） | 終了マーカーのみ | false が返される | High |
| TC-CONF-008 | マーカー検証（マーカーなし） | マーカーなし | false が返される | High |
| TC-CONF-009 | 自動解決（3条件満たす） | 条件1,2,3 全て満たす | コンフリクトマーカー削除、ファイル修正 | High |
| TC-CONF-010 | 手動解決待ち（条件2不満足） | Upstream側に変更あり | manualRequired リストに追加 | High |
| TC-CONF-011 | 手動解決待ち（条件3不満足） | マーカーなし | manualRequired リストに追加 | High |
| TC-CONF-012 | 1ファイル複数コンフリクト（部分解決） | 複数コンフリクト、一部は自動解決可能 | 自動解決可能な部分のみ解決 | High |

**テストコード例**:
```typescript
import { describe, it, expect } from 'bun:test';
import { ConflictResolver } from '../../conflict/ConflictResolver';

describe('ConflictResolver', () => {
  it('should detect single conflict marker', async () => {
    const resolver = new ConflictResolver(mockLogger);
    const content = `
line 1
<<<<<<< HEAD
custom code
=======
upstream code
>>>>>>> upstream/main
line 2
`;
    const markers = await resolver.detectConflicts(testFilePath);
    
    expect(markers).toHaveLength(1);
  });

  it('should validate custom code markers', () => {
    const resolver = new ConflictResolver(mockLogger);
    const conflictContent = '// CUSTOM-CODE-START\nchanged content\n// CUSTOM-CODE-END';
    
    const isMarked = resolver.isMarkedAsCustom(
      conflictContent,
      { /* marker */ },
      '// CUSTOM-CODE-START',
      '// CUSTOM-CODE-END'
    );
    
    expect(isMarked).toBe(true);
  });

  it('should auto-resolve conflict when all conditions are met', async () => {
    const resolver = new ConflictResolver(mockLogger);
    
    const result = await resolver.resolveConflicts(
      [testFilePath],
      config,
      lastMergedCommit,
      currentCommit,
      gitService
    );
    
    expect(result.autoResolved).toContain(testFilePath);
  });
});
```

---

### 2.5 ReportGenerator テスト

**テストファイル**: `src/__tests__/unit/report-generator.test.ts`

| TC ID | テスト項目 | 入力 | 期待結果 | 優先度 |
|-------|-----------|------|---------|--------|
| TC-REPORT-001 | CLIサマリー生成 | ResolutionResult | サマリー文字列が返される | High |
| TC-REPORT-002 | CLIサマリー内容（自動解決数） | autoResolved: 3個 | "自動解決されたファイル数: 3 件" が含まれる | High |
| TC-REPORT-003 | CLIサマリー内容（手動解決数） | manualRequired: 2個 | "手動解決が必要なファイル数: 2 件" が含まれる | High |
| TC-REPORT-004 | CLIサマリー内容（ファイルリスト） | autoResolvedFiles: ["file1.ts", "file2.ts"] | ファイル名が列挙されている | High |
| TC-REPORT-005 | ログファイル生成 | ログエントリ配列 | ログファイルが生成される | High |
| TC-REPORT-006 | ログファイル名形式 | - | ファイル名が `merge-report-YYYYMMDD-HHMMSS.log` 形式 | High |
| TC-REPORT-007 | ログファイル内容 | ログエントリ配列 | 全ログが記録されている | High |
| TC-REPORT-008 | ログファイル書き込み失敗 | 権限なし | エラーが記録される | Medium |

**テストコード例**:
```typescript
import { describe, it, expect } from 'bun:test';
import { ReportGenerator } from '../../report/ReportGenerator';

describe('ReportGenerator', () => {
  it('should generate CLI summary', () => {
    const generator = new ReportGenerator(mockLogger);
    const result = {
      autoResolved: ['file1.ts', 'file2.ts'],
      manualRequired: ['file3.ts'],
      details: []
    };
    
    const summary = generator.generateCLISummary(result);
    
    expect(summary).toContain('自動解決されたファイル数: 2 件');
    expect(summary).toContain('手動解決が必要なファイル数: 1 件');
    expect(summary).toContain('file1.ts');
  });

  it('should generate log file with correct name format', async () => {
    const generator = new ReportGenerator(mockLogger);
    const logPath = await generator.generateLogFile(result, mockLogs);
    
    expect(logPath).toMatch(/merge-report-\d{8}-\d{6}\.log/);
  });
});
```

---

## 3. 統合テスト

### 3.1 Config読み込み → Git操作

**テストファイル**: `src/__tests__/integration/config-to-git.test.ts`

| TC ID | テスト項目 | 手順 | 期待結果 |
|-------|-----------|------|---------|
| TC-INT-001 | 設定読み込み → fetch実行 | 1. 設定ファイル読み込み<br>2. GitService 初期化<br>3. fetch 実行 | fetch が正常に実行される |
| TC-INT-002 | 設定読み込み → merge実行 | 1. 設定ファイル読み込み<br>2. GitService 初期化<br>3. merge 実行 | merge が正常に実行される |
| TC-INT-003 | 設定値の伝播 | 1. config.json 読み込み<br>2. upstream_repository_name を GitService に渡す | 正しいリモート名で git 操作が実行される |

---

### 3.2 Git操作 → コンフリクト解決

**テストファイル**: `src/__tests__/integration/git-to-resolver.test.ts`

| TC ID | テスト項目 | 手順 | 期待結果 |
|-------|-----------|------|---------|
| TC-INT-004 | merge後のコンフリクト検出 | 1. merge 実行<br>2. コンフリクト発生<br>3. ConflictResolver で検出 | コンフリクトファイルが検出される |
| TC-INT-005 | コンフリクト自動解決 | 1. merge 実行<br>2. ConflictResolver で解決<br>3. git add 実行 | ファイルがステージングされる |

---

### 3.3 コンフリクト解決 → レポート生成

**テストファイル**: `src/__tests__/integration/resolver-to-report.test.ts`

| TC ID | テスト項目 | 手順 | 期待結果 |
|-------|-----------|------|---------|
| TC-INT-006 | 解決結果 → レポート生成 | 1. ConflictResolver で解決<br>2. ReportGenerator でレポート生成 | レポートにファイル情報が含まれる |
| TC-INT-007 | ファイルリスト → CLIサマリー | 1. 解決ファイル、未解決ファイルリスト生成<br>2. CLIサマリー出力 | サマリーに正しいファイル情報が表示される |

---

## 4. エンドツーエンドテスト

### 4.1 正常系シナリオ1: コンフリクトなし

**テストファイル**: `src/__tests__/e2e/scenario-no-conflict.sh`

```bash
#!/bin/bash
# テストリポジトリセットアップ
mkdir -p test-repo/upstream test-repo/local
cd test-repo/local
git init

# Upstreamリモート登録
git remote add upstream ../upstream

# 初期コミット
echo "content" > file.txt
git add file.txt
git commit -m "Initial commit"

# ツール実行
./bin/merge-tool

# 期待結果: コンフリクトなし、正常終了
```

**期待結果**:
- [ ] ツールが正常に完了
- [ ] 「マージが正常に完了しました」メッセージが表示
- [ ] ツール終了コード = 0

---

### 4.2 正常系シナリオ2: 自動解決可能なコンフリクト

**テストファイル**: `src/__tests__/e2e/scenario-auto-resolve.sh`

```bash
#!/bin/bash
# テストリポジトリセットアップ
# 1. Upstream 側：ファイル変更なし
# 2. Local 側：独自実装マーカー内で変更

# ツール実行
./bin/merge-tool

# 期待結果: コンフリクト自動解決
```

**期待結果**:
- [ ] ツールがコンフリクトを自動解決
- [ ] 「自動解決されたファイル数: 1 件」と表示
- [ ] ファイルがステージングされている（git status で確認）
- [ ] ツール終了コード = 0

---

### 4.3 正常系シナリオ3: 手動解決が必要なコンフリクト

**テストファイル**: `src/__tests__/e2e/scenario-manual-resolve.sh`

```bash
#!/bin/bash
# テストリポジトリセットアップ
# 1. Upstream 側：ファイル変更あり
# 2. Local 側：独自実装マーカー内で変更

# ツール実行
./bin/merge-tool

# 期待結果: コンフリクトが手動解決待ちになる
```

**期待結果**:
- [ ] 「手動解決が必要なファイル数: 1 件」と表示
- [ ] ファイルがステージングされていない
- [ ] ツール終了コード = 0

---

### 4.4 エラーケース1: 設定ファイルなし

**テストファイル**: `src/__tests__/e2e/scenario-no-config.sh`

```bash
#!/bin/bash
# config.json なしで実行
./bin/merge-tool

# 期待結果: エラーメッセージ表示、異常終了
```

**期待結果**:
- [ ] エラーメッセージ「設定ファイルが見つかりません」が表示
- [ ] ツール終了コード = 1

---

### 4.5 エラーケース2: 不正な設定ファイル

**テストファイル**: `src/__tests__/e2e/scenario-invalid-config.sh`

```bash
#!/bin/bash
# config.json に必須項目なし
echo '{"upstream_repository_name": "upstream"}' > config.json
./bin/merge-tool

# 期待結果: エラーメッセージ表示、異常終了
```

**期待結果**:
- [ ] エラーメッセージに不足している項目名が表示
- [ ] ツール終了コード = 1

---

### 4.6 エラーケース3: Gitリポジトリでない

**テストファイル**: `src/__tests__/e2e/scenario-not-git-repo.sh`

```bash
#!/bin/bash
# Gitリポジトリ外で実行
mkdir -p test-non-git
cd test-non-git
./bin/merge-tool

# 期待結果: エラーメッセージ表示、異常終了
```

**期待結果**:
- [ ] エラーメッセージが表示
- [ ] ツール終了コード = 1

---

### 4.7 エラーケース4: 無効なリモート名

**テストファイル**: `src/__tests__/e2e/scenario-invalid-remote.sh`

```bash
#!/bin/bash
# 無効なリモート名を指定
echo '{
  "upstream_repository_name": "nonexistent",
  "upstream_branch_name": "main",
  "last_merged_upstream_commit": "abc123...",
  "custom_code_marker": {
    "start": "// CUSTOM-CODE-START",
    "end": "// CUSTOM-CODE-END"
  }
}' > config.json
./bin/merge-tool

# 期待結果: エラーメッセージ表示、異常終了
```

**期待結果**:
- [ ] Gitエラーメッセージが表示
- [ ] ツール終了コード = 1

---

## 5. テスト実行スケジュール

| フェーズ | タイミング | テスト項目 |
|---------|----------|----------|
| Phase 1 完了時 | Week 1 末 | ユニットテスト (Logger, ConfigManager, GitService) |
| Phase 2 完了時 | Week 2 末 | ユニットテスト (ConflictResolver) + 統合テスト |
| Phase 3 完了時 | Week 3 末 | ユニットテスト (ReportGenerator) + E2E テスト |
| リリース前 | Week 4 | 全テスト + 各OS での動作確認 |

---

## 6. テスト環境

### 6.1 ローカルテスト環境

```bash
# テストリポジトリディレクトリ
tests/
├── fixtures/
│   ├── config.json
│   ├── config-invalid.json
│   └── ...
├── test-repos/
│   ├── no-conflict/
│   ├── auto-resolve/
│   └── manual-resolve/
└── logs/
    └── (テスト実行ログ)
```

### 6.2 テストリポジトリセットアップ

```bash
#!/bin/bash
# test-repos/no-conflict を初期化

mkdir -p test-repos/no-conflict/{upstream,local}

# Upstream リポジトリ
cd test-repos/no-conflict/upstream
git init --bare

# Local リポジトリ
cd ../local
git init
git remote add upstream ../upstream

echo "initial content" > file.txt
git add file.txt
git commit -m "Initial commit"
git push -u upstream main
```

---

## 7. テスト成功基準

### 7.1 ユニットテスト

- [ ] 全テストが PASS
- [ ] コードカバレッジ >= 80%
- [ ] エラーケースが網羅されている

### 7.2 統合テスト

- [ ] 各モジュール間の連携が正常に動作
- [ ] データの受け渡しが正しい

### 7.3 E2E テスト

- [ ] 全シナリオが PASS
- [ ] エラーハンドリングが正常に動作
- [ ] 出力形式が要件を満たす

### 7.4 クロスプラットフォーム

- [ ] macOS で全テスト PASS
- [ ] Windows で全テスト PASS
- [ ] Linux で全テスト PASS

---

## 8. テスト報告書テンプレート

### 8.1 テスト実行結果

```markdown
# テスト実行報告書 - 2025-10-XX

## テスト概要
- 実行日: 2025-10-XX
- テスト対象: Upstream自動マージツール
- テスト対象版: v1.0.0

## 実行結果

### ユニットテスト
- Logger: 8/8 PASS
- ConfigManager: 11/11 PASS
- GitService: 9/9 PASS
- ConflictResolver: 12/12 PASS
- ReportGenerator: 8/8 PASS
- **合計: 48/48 PASS**

### 統合テスト
- Config → Git: 3/3 PASS
- Git → Resolver: 2/2 PASS
- Resolver → Report: 2/2 PASS
- **合計: 7/7 PASS**

### E2E テスト
- 正常系1（コンフリクトなし）: PASS
- 正常系2（自動解決）: PASS
- 正常系3（手動解決）: PASS
- エラーケース1（設定なし）: PASS
- エラーケース2（不正な設定）: PASS
- エラーケース3（非Gitリポジトリ）: PASS
- エラーケース4（無効なリモート）: PASS
- **合計: 7/7 PASS**

### クロスプラットフォーム
- macOS: PASS
- Windows: PASS
- Linux: PASS

## 総合判定
✅ **テスト完了・リリース可能**

## 指摘事項
（ある場合は記載）
```

---

## 関連ドキュメント

- 要件定義書: `docs/02_requirements/features/upstream-merge-tool-requirements.md`
- アーキテクチャ設計書: `docs/03_design/architecture/upstream-merge-tool-architecture.md`
- 実装計画書: `docs/04_implementation/plans/upstream-merge-tool/20251019_01_implementation-plan.md`

---

## 版履歴

| 版 | 更新日 | 更新内容 |
|----|--------|---------|
| 1.0 | 2025-10-19 | 初版作成。ユニット・統合・E2Eテストケースを定義 |
