# 20251019_04_test-implementation-strategy

**作成日**: 2025-10-19  
**タイトル**: Upstream自動マージツール テスト実装戦略書  
**ステータス**: 進行中

---

## 📋 概要

実装完了したUpstream自動マージツールの**品質保証とテスト自動化**を実現するための戦略書です。ユニットテストから始め、段階的に統合テスト・E2Eテストへ拡張します。ローカル開発環境での実行を前提としながら、将来的なCI/CD環境（GitHub Actions等）への移行にも対応できる設計にします。

---

## 🎯 テスト実装の目標

| 目標 | 説明 |
|------|------|
| **品質保証** | 実装されたコードの正確性を検証し、本番環境での動作を担保 |
| **回帰テスト** | 将来の変更によるバグ発生を早期に検出 |
| **ドキュメント** | テストコードが実装の意図を明確にし、ドキュメント役として機能 |
| **段階的実装** | ユニット → 統合 → E2E の順で、リスクを最小化しながら実装 |
| **CI/CD対応** | ローカル実行可能で、将来的にGitHub Actionsへの移行が容易な設計 |

---

## 📊 テスト体系

### 階層別テスト構成

```
┌─────────────────────────────────────────────────┐
│        E2E Tests (実機テスト)                    │
│  実際のGitリポジトリでのシナリオテスト         │
│  実行時間: 遅い（分単位）                       │
│  テストケース数: 7個                            │
└────────────────┬────────────────────────────────┘
                 △
                 │
┌─────────────────────────────────────────────────┐
│    Integration Tests (統合テスト)               │
│  モジュール間の連携を検証                       │
│  実行時間: 中程度（秒単位）                     │
│  テストケース数: 7個                            │
└────────────────┬────────────────────────────────┘
                 △
                 │
┌─────────────────────────────────────────────────┐
│      Unit Tests (ユニットテスト)                │
│  個別モジュールの機能を検証                     │
│  実行時間: 高速（ミリ秒単位）                   │
│  テストケース数: 48個                           │
│  - Logger: 8個                                   │
│  - ConfigManager: 11個                          │
│  - GitService: 9個                              │
│  - ConflictResolver: 12個                       │
│  - ReportGenerator: 8個                         │
└─────────────────────────────────────────────────┘
```

### 実装フロー

```
フェーズ1: ユニットテスト構築
  ├─ Week 1-2: Logger, ConfigManager, GitService テスト実装
  ├─ 目標: 基本的なモジュール機能を検証
  └─ 合格基準: 全テスト PASS、カバレッジ >= 80%

フェーズ2: 統合テスト構築
  ├─ Week 2-3: ConflictResolver, ReportGenerator テスト実装
  ├─ 目標: モジュール間の連携を検証
  └─ 合格基準: 全テスト PASS、データフロー正確

フェーズ3: E2Eテスト構築
  ├─ Week 3-4: 実機シナリオテスト実装
  ├─ 目標: 実際のGitリポジトリでの動作を検証
  └─ 合格基準: 全シナリオ PASS、終了コード正確

フェーズ4: CI/CD統合
  ├─ Week 4: GitHub Actions ワークフロー構築
  ├─ 目標: 自動テスト実行環境構築
  └─ 合格基準: 自動テスト実行成功、結果レポート
```

---

## 🛠️ テストフレームワークと環境

### フレームワーク選択

#### ユニット・統合テスト: **Bun 標準テストフレームワーク** (`bun:test`)

**選択理由**:
- Bunに統合済み（追加インストール不要）
- TypeScript ネイティブサポート
- シンプルで学習コストが低い
- Jest互換で、将来的にJestへの移行が容易

**特徴**:
```typescript
import { describe, it, expect } from 'bun:test';

describe('Module', () => {
  it('should do something', () => {
    expect(result).toBe(expected);
  });
});
```

#### E2Eテスト: **シェルスクリプト + テスト用Gitリポジトリ**

**選択理由**:
- 実際のGit操作を検証可能
- 外部依存なし（シェルとGit標準機能のみ）
- 各OSで一貫性のある動作

**構成**:
```bash
src/__tests__/e2e/
├── setup.sh              # テスト環境構築
├── scenario-no-conflict.sh
├── scenario-auto-resolve.sh
├── scenario-manual-resolve.sh
├── error-no-config.sh
├── error-invalid-config.sh
├── error-not-git-repo.sh
└── error-invalid-remote.sh
```

### ディレクトリ構成

```
src/__tests__/
├── unit/                          # ユニットテスト
│   ├── logger.test.ts            # Logger: 8個テスト
│   ├── config-manager.test.ts    # ConfigManager: 11個テスト
│   ├── git-service.test.ts       # GitService: 9個テスト
│   ├── conflict-resolver.test.ts # ConflictResolver: 12個テスト
│   ├── report-generator.test.ts  # ReportGenerator: 8個テスト
│   └── setup.ts                  # 共通セットアップ（モック等）
│
├── integration/                   # 統合テスト（今後実装）
│   ├── config-to-git.test.ts
│   ├── git-to-resolver.test.ts
│   └── resolver-to-report.test.ts
│
├── e2e/                          # E2Eテスト（今後実装）
│   ├── setup.sh
│   ├── scenario-no-conflict.sh
│   ├── scenario-auto-resolve.sh
│   ├── scenario-manual-resolve.sh
│   ├── error-no-config.sh
│   ├── error-invalid-config.sh
│   ├── error-not-git-repo.sh
│   └── error-invalid-remote.sh
│
└── fixtures/                     # テストデータ
    ├── valid-config.json
    ├── invalid-config.json
    ├── conflict-file.txt
    └── ...
```

---

## 📝 ユニットテスト実装仕様

### 実装順序と依存関係

```
1. Logger テスト
   └─ 最も基本的なモジュール、他のテストで使用
   
2. ConfigManager テスト
   ├─ Logger に依存
   └─ ファイルI/O、バリデーションテスト
   
3. GitService テスト
   ├─ Logger に依存
   └─ 外部コマンド実行（Gitコマンド）をモック
   
4. ConflictResolver テスト
   ├─ Logger, GitService に依存
   └─ 複雑な条件判定ロジック
   
5. ReportGenerator テスト
   ├─ Logger に依存
   └─ 出力形式の検証
```

### ユニットテストの原則

#### 1. **モック戦略**

外部依存をモック化して、純粋なロジックテストに集中：

```typescript
// Logger モック（テスト用）
const mockLogger = {
  info: (msg: string) => {},
  warn: (msg: string) => {},
  error: (msg: string) => {},
  debug: (msg: string) => {},
  getLogs: () => [],
};

// GitService のテスト時は実際のGitコマンドをモック
import { $ } from 'bun';
// モック例: $ = vi.fn() で置き換え
```

#### 2. **テスト分離**

各テストケースは独立して実行可能：

- テスト間でのファイルシステム状態の共有なし
- テスト前後でテンポラリファイルをクリーンアップ
- 実行順序による依存性なし

#### 3. **Arrange-Act-Assert パターン**

```typescript
it('should process valid config', () => {
  // Arrange: テストデータ準備
  const config = { /* ... */ };
  const manager = new ConfigManager(mockLogger);
  
  // Act: 実行
  const result = manager.validateConfig(config);
  
  // Assert: 検証
  expect(result.isValid).toBe(true);
});
```

#### 4. **エッジケースのカバレッジ**

- 正常系だけでなく、エラー系も必ずテスト
- 境界値（最小値、最大値）をテスト
- null/undefined の処理をテスト

### 各モジュール別テスト仕様

#### **Logger テスト** (8個)

```typescript
// TC-LOG-001: info メソッド
it('should create an info log entry', () => {
  const logger = new Logger();
  logger.info('Test message');
  const logs = logger.getLogs();
  
  expect(logs).toHaveLength(1);
  expect(logs[0].level).toBe('INFO');
  expect(logs[0].message).toBe('Test message');
});

// TC-LOG-005: コンテキスト付きログ
it('should include context in log entry', () => {
  const logger = new Logger();
  const context = { userId: '123', action: 'test' };
  logger.info('User action', context);
  
  const logs = logger.getLogs();
  expect(logs[0].context).toEqual(context);
});

// ... 残り 6個も同様に実装
```

**テストケース一覧**:
- TC-LOG-001: info メソッド
- TC-LOG-002: warn メソッド
- TC-LOG-003: error メソッド
- TC-LOG-004: debug メソッド
- TC-LOG-005: コンテキスト付きログ
- TC-LOG-006: ログ取得
- TC-LOG-007: ログエントリの形式
- TC-LOG-008: ログの順序

#### **ConfigManager テスト** (11個)

```typescript
// TC-CFG-001: 正常な設定ファイル読み込み
it('should load a valid config file', async () => {
  const configManager = new ConfigManager(mockLogger);
  const config = await configManager.loadConfig('./fixtures/valid-config.json');
  
  expect(config.upstream_repository_name).toBeDefined();
  expect(config.upstream_branch_name).toBeDefined();
});

// TC-CFG-008: コミットハッシュ形式検証
it('should validate SHA-1 commit hash format', () => {
  const configManager = new ConfigManager(mockLogger);
  const result = configManager.validateConfig({
    // ... 他の項目
    last_merged_upstream_commit: 'abc1234567890def1234567890def1234567890'
  });
  
  expect(result.isValid).toBe(true);
});

// ... 残り 9個も同様に実装
```

**テストケース一覧**:
- TC-CFG-001: 正常な設定ファイル読み込み
- TC-CFG-002: ファイル存在チェック
- TC-CFG-003: JSON形式検証
- TC-CFG-004～007: 必須項目検証（4個）
- TC-CFG-008～010: コミットハッシュ形式検証（3個）
- TC-CFG-011: 設定値の返却

#### **GitService テスト** (9個)

**注意**: Git操作テストはモックを活用

```typescript
// TC-GIT-001: fetch 成功
it('should execute git fetch successfully', async () => {
  const gitService = new GitService(mockLogger);
  
  // モック: fetch コマンド成功を想定
  expect(async () => {
    await gitService.fetch('origin');
  }).not.toThrow();
});

// TC-GIT-003: merge 成功（コンフリクトなし）
it('should merge without conflicts', async () => {
  const gitService = new GitService(mockLogger);
  
  const result = await gitService.merge('upstream', 'main');
  
  expect(result.success).toBe(true);
  expect(result.conflictFiles).toHaveLength(0);
});

// ... 残り 7個も同様に実装
```

**テストケース一覧**:
- TC-GIT-001: fetch 成功
- TC-GIT-002: fetch 失敗（無効なリモート）
- TC-GIT-003: merge 成功（コンフリクトなし）
- TC-GIT-004: merge 失敗（コンフリクトあり）
- TC-GIT-005: コンフリクトファイルリスト取得
- TC-GIT-006: git add 実行
- TC-GIT-007: コミットハッシュ取得
- TC-GIT-008: 差分取得
- TC-GIT-009: リポジトリ状態確認

#### **ConflictResolver テスト** (12個)

```typescript
// TC-CONF-001: 単一コンフリクト検出
it('should detect single conflict marker', async () => {
  const resolver = new ConflictResolver(mockLogger);
  const content = `line 1
<<<<<<< HEAD
custom code
=======
upstream code
>>>>>>> upstream/main
line 2`;
  
  const markers = await resolver.detectConflicts(content);
  
  expect(markers).toHaveLength(1);
  expect(markers[0].ours).toBe('custom code');
  expect(markers[0].theirs).toBe('upstream code');
});

// TC-CONF-009: 自動解決（3条件満たす）
it('should auto-resolve conflict when all conditions are met', async () => {
  const resolver = new ConflictResolver(mockLogger);
  
  // 3条件を満たす設定を用意
  const result = await resolver.resolveConflicts(
    [testFilePath],
    config,
    mockGitService
  );
  
  expect(result.autoResolved).toContain(testFilePath);
});

// ... 残り 10個も同様に実装
```

**テストケース一覧**:
- TC-CONF-001: 単一コンフリクト検出
- TC-CONF-002: 複数コンフリクト検出
- TC-CONF-003: Upstream側変更なし判定（真）
- TC-CONF-004: Upstream側変更あり判定（偽）
- TC-CONF-005: マーカー検証（完全に囲まれている）
- TC-CONF-006: マーカー検証（開始マーカーのみ）
- TC-CONF-007: マーカー検証（終了マーカーのみ）
- TC-CONF-008: マーカー検証（マーカーなし）
- TC-CONF-009: 自動解決（3条件満たす）
- TC-CONF-010: 手動解決待ち（条件2不満足）
- TC-CONF-011: 手動解決待ち（条件3不満足）
- TC-CONF-012: 1ファイル複数コンフリクト（部分解決）

#### **ReportGenerator テスト** (8個)

```typescript
// TC-REPORT-001: CLIサマリー生成
it('should generate CLI summary', () => {
  const generator = new ReportGenerator(mockLogger);
  const result = {
    autoResolved: ['file1.ts', 'file2.ts'],
    manualRequired: ['file3.ts']
  };
  
  const summary = generator.generateCLISummary(result);
  
  expect(summary).toContain('自動解決されたファイル数: 2 件');
  expect(summary).toContain('手動解決が必要なファイル数: 1 件');
});

// TC-REPORT-006: ログファイル名形式
it('should generate log file with correct timestamp format', async () => {
  const generator = new ReportGenerator(mockLogger);
  
  const logPath = await generator.generateLogFile(result, mockLogs);
  
  expect(logPath).toMatch(/merge-report-\d{8}-\d{6}\.log/);
});

// ... 残り 6個も同様に実装
```

**テストケース一覧**:
- TC-REPORT-001: CLIサマリー生成
- TC-REPORT-002: CLIサマリー内容（自動解決数）
- TC-REPORT-003: CLIサマリー内容（手動解決数）
- TC-REPORT-004: CLIサマリー内容（ファイルリスト）
- TC-REPORT-005: ログファイル生成
- TC-REPORT-006: ログファイル名形式
- TC-REPORT-007: ログファイル内容
- TC-REPORT-008: ログファイル書き込み失敗

---

## 🔄 テスト実行フロー

### ローカル実行

```bash
# 全ユニットテスト実行
bun test src/__tests__/unit

# 特定のモジュールのみ実行
bun test src/__tests__/unit/logger.test.ts

# カバレッジ表示
bun test src/__tests__/unit --coverage
```

### CI/CD環境（GitHub Actions）での実行

```yaml
# .github/workflows/test.yml
name: Unit Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test src/__tests__/unit
      - run: bun test src/__tests__/unit --coverage
```

---

## 📊 テスト成功基準

### Phase 1: ユニットテスト

| 項目 | 基準 | 状態 |
|------|------|------|
| テストケース数 | 48個全て PASS | □ |
| コードカバレッジ | >= 80% | □ |
| エラーケース | 全て網羅 | □ |
| 実行時間 | < 5秒 | □ |

### Phase 2: 統合テスト

| 項目 | 基準 | 状態 |
|------|------|------|
| テストケース数 | 7個全て PASS | □ |
| モジュール間の連携 | 正常動作 | □ |
| データフロー | 正確 | □ |
| 実行時間 | < 10秒 | □ |

### Phase 3: E2Eテスト

| 項目 | 基準 | 状態 |
|------|------|------|
| 正常系シナリオ | 3個全て PASS | □ |
| エラーケース | 4個全て PASS | □ |
| クロスプラットフォーム | macOS/Windows/Linux PASS | □ |
| 実行時間 | < 60秒 | □ |

---

## 📈 今後の展開（今後実装）

### Phase 2: 統合テスト（Week 2-3）

統合テストは以下の連携を検証：

1. Config読み込み → Git操作
2. Git操作 → コンフリクト解決
3. コンフリクト解決 → レポート生成

### Phase 3: E2Eテスト（Week 3-4）

実際のGitリポジトリでのシナリオテスト：

1. 正常系（コンフリクトなし）
2. 正常系（自動解決可能）
3. 正常系（手動解決が必要）
4. エラーケース（設定なし）
5. エラーケース（不正な設定）
6. エラーケース（非Gitリポジトリ）
7. エラーケース（無効なリモート）

### Phase 4: CI/CD統合（Week 4）

GitHub Actions ワークフロー構築：

- プッシュ時の自動テスト実行
- PR作成時のテスト実行
- テストカバレッジレポート生成
- 各OSでのマトリックステスト

---

## 🛡️ テスト保守戦略

### テストコードの品質

1. **DRY 原則**: テストコード内の重複を避ける
2. **明確な命名**: テストケース名で何をテストしているか一目瞭然に
3. **コメント**: 複雑なテストロジックには説明コメント付与
4. **定期的なレビュー**: 実装変更時にテストも更新

### テスト追加時のチェックリスト

- [ ] 新しいテストは既存テストと重複していないか
- [ ] エッジケースを網羅しているか
- [ ] 実行時間は許容範囲か（ユニットテスト: 100ms以下）
- [ ] ドキュメント（テストケースID、目的）は明確か
- [ ] モック・フィクスチャは再利用可能か

---

## 📚 参考資料

- 既存テストケース文書: `docs/05_testing/test-cases/upstream-merge-tool-test-cases.md`
- Bun テスト公式ドキュメント: https://bun.sh/docs/test/overview
- Jest 互換性: Bun は Jest の構文とほぼ互換

---

## 🚀 実装スケジュール

### Week 1 (2025-10-20 ～ 2025-10-26)

- [ ] 2025-10-20: Logger テスト実装 + 実行確認
- [ ] 2025-10-21: ConfigManager テスト実装 + 実行確認
- [ ] 2025-10-22: GitService テスト実装 + 実行確認
- [ ] 2025-10-23～24: テスト修正・最適化
- [ ] 2025-10-25: テスト実行レポート作成

### Week 2 (2025-10-27 ～ 2025-11-02)

- [ ] 2025-10-27: ConflictResolver テスト実装
- [ ] 2025-10-28: ReportGenerator テスト実装
- [ ] 2025-10-29: 全ユニットテスト統合実行
- [ ] 2025-10-30～11-01: 統合テスト実装
- [ ] 2025-11-02: テスト実行レポート作成

### Week 3 (2025-11-03 ～ 2025-11-09)

- [ ] 2025-11-03～05: E2Eテスト実装
- [ ] 2025-11-06: 全テスト統合実行
- [ ] 2025-11-07: クロスプラットフォーム検証
- [ ] 2025-11-08～09: テスト修正・ドキュメント整備

### Week 4 (2025-11-10 ～ 2025-11-16)

- [ ] 2025-11-10～12: GitHub Actions ワークフロー構築
- [ ] 2025-11-13: CI/CD統合テスト実行
- [ ] 2025-11-14～15: 最終調整・ドキュメント完成
- [ ] 2025-11-16: リリース準備完了

---

## ✅ チェックリスト

### テスト環境セットアップ

- [ ] `src/__tests__` ディレクトリ構造作成
- [ ] `package.json` にテスト実行スクリプト追加
- [ ] テストフィクスチャファイル作成
- [ ] `bun test` で基本的なテスト実行確認

### ユニットテスト実装

- [ ] Logger テスト完了（8個）
- [ ] ConfigManager テスト完了（11個）
- [ ] GitService テスト完了（9個）
- [ ] ConflictResolver テスト完了（12個）
- [ ] ReportGenerator テスト完了（8個）

### テスト統合・検証

- [ ] 全ユニットテスト PASS
- [ ] カバレッジ >= 80%
- [ ] 実行時間 < 5秒
- [ ] ログ出力明確・わかりやすい

---

**作成日**: 2025-10-19  
**著者**: GitHub Copilot + Upstream Team  
**ステータス**: 進行中  
**次のアクション**: Logger ユニットテスト実装開始
