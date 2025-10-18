# 20251019_06_integration-test-plan

**作成日**: 2025-10-19  
**タイトル**: 統合テスト実装計画  
**ステータス**: NOT-STARTED

---

## 📋 概要

ユニットテストが完了（145個テスト、全PASS）したため、次フェーズの統合テスト実装に進みます。統合テストでは、モジュール間の連携、データフロー、エラーハンドリングを検証します。

---

## 🎯 統合テストの目的

| 目的 | 詳細 |
|------|------|
| **モジュール連携確認** | 各モジュールが正しく連携しているか検証 |
| **エンドツーエンドの流れ** | 設定読み込み → Git操作 → コンフリクト解決 → レポート生成の一連の流れ |
| **データ変換検証** | モジュール間でのデータ変換が正確に行われるか |
| **エラー伝播確認** | エラーが正しく伝播し、適切にハンドリングされるか |

---

## 📊 統合テストアーキテクチャ

### テスト対象の連携フロー

```
┌──────────────┐
│ ConfigManager│ ← 設定ファイル読み込み
└──────┬───────┘
       │ config: MergeConfig
       ▼
┌──────────────┐
│  GitService  │ ← リモートfetch、マージ実行
└──────┬───────┘
       │ mergeResult: MergeResult
       ▼
┌─────────────────────┐
│ ConflictResolver    │ ← コンフリクト検出・解決
└──────┬──────────────┘
       │ resolveResult: ResolveResult
       ▼
┌─────────────────────┐
│ ReportGenerator     │ ← レポート生成・ログ出力
└─────────────────────┘
```

### 統合テスト構成

```
src/__tests__/integration/
├── config-to-git.test.ts           # ConfigManager → GitService
├── git-to-resolver.test.ts         # GitService → ConflictResolver
├── resolver-to-report.test.ts      # ConflictResolver → ReportGenerator
└── end-to-end-flow.test.ts        # 完全なフロー統合テスト（今後）
```

---

## 🧪 統合テストケース定義

### Test Suite 1: ConfigManager → GitService

**ファイル**: `config-to-git.test.ts`  
**テスト数**: 4個  
**焦点**: 設定情報の読み込みからGit操作までの連携

#### TC-INT-001: 正常な設定でGitサービスが初期化される

```typescript
describe('ConfigManager → GitService', () => {
  it('TC-INT-001: should initialize GitService with valid config', async () => {
    // Arrange: 正常な設定ファイル
    const configPath = './fixtures/valid-config.json';
    const configManager = new ConfigManager(mockLogger);
    
    // Act: 設定読み込み
    const config = await configManager.loadConfig(configPath);
    
    // GitServiceの初期化に使用できるか確認
    const gitService = new GitService(mockLogger, config.repository_path);
    
    // Assert: GitService が正しく初期化されたか
    expect(gitService).toBeDefined();
    expect(gitService.getRepositoryPath()).toBe(config.repository_path);
  });
});
```

**検証ポイント**:
- ConfigManagerが設定を正しく読み込める
- 読み込まれた設定でGitServiceが初期化可能
- repositoryPath などの属性が正しく引き継がれる

#### TC-INT-002: 無効な設定ファイルでエラーが伝播される

```typescript
it('TC-INT-002: should propagate error from invalid config', async () => {
  // Arrange: 無効な設定ファイル
  const configPath = './fixtures/invalid-config.json';
  const configManager = new ConfigManager(mockLogger);
  
  // Act & Assert: エラーが発生する
  expect(async () => {
    await configManager.loadConfig(configPath);
  }).toThrow();
});
```

**検証ポイント**:
- 無効な設定でエラーが発生する
- エラーメッセージが適切

#### TC-INT-003: 設定のリモート情報がGit操作に正しく反映される

```typescript
it('TC-INT-003: should use remote info from config in Git operations', async () => {
  // Arrange: 設定を読み込み
  const configManager = new ConfigManager(mockLogger);
  const config = await configManager.loadConfig('./fixtures/valid-config.json');
  
  // GitService を初期化（実際にはモック）
  const gitService = new GitService(mockLogger, config.repository_path);
  
  // Act: リモート情報を取得
  const remoteInfo = {
    upstreamName: config.upstream_repository_name,
    branchName: config.upstream_branch_name
  };
  
  // Assert: 設定から取得したリモート情報が正しい
  expect(remoteInfo.upstreamName).toBe('upstream');
  expect(remoteInfo.branchName).toBe('main');
});
```

**検証ポイント**:
- 設定のリモート情報が正しく抽出される
- Git操作で使用される値が正確

#### TC-INT-004: 複数の設定項目が正しく連鎖している

```typescript
it('TC-INT-004: should chain all config items correctly', async () => {
  // Arrange
  const configManager = new ConfigManager(mockLogger);
  const config = await configManager.loadConfig('./fixtures/valid-config.json');
  
  // Assert: すべての必須項目が揃っている
  expect(config.repository_path).toBeDefined();
  expect(config.upstream_repository_name).toBeDefined();
  expect(config.upstream_branch_name).toBeDefined();
  expect(config.last_merged_upstream_commit).toBeDefined();
  expect(config.custom_code_section_markers).toBeDefined();
});
```

**検証ポイント**:
- すべての設定項目が正しく読み込まれている
- 必須項目が不足していない

---

### Test Suite 2: GitService → ConflictResolver

**ファイル**: `git-to-resolver.test.ts`  
**テスト数**: 4個  
**焦点**: Git操作の結果がConflictResolverに正しく渡される

#### TC-INT-005: マージ結果からコンフリクト情報が正しく抽出される

```typescript
describe('GitService → ConflictResolver', () => {
  it('TC-INT-005: should extract conflict info from merge result', async () => {
    // Arrange: マージ結果をシミュレート
    const mockGitService = {
      merge: async () => ({
        success: false,
        conflictFiles: ['src/main.ts', 'src/config.ts'],
        message: 'Merge conflict'
      })
    };
    
    const conflictResolver = new ConflictResolver(mockLogger);
    
    // Act: マージ結果からコンフリクトファイルを取得
    const mergeResult = await mockGitService.merge();
    
    // Assert: コンフリクト情報が正しく抽出される
    expect(mergeResult.conflictFiles).toHaveLength(2);
    expect(mergeResult.conflictFiles).toContain('src/main.ts');
  });
});
```

**検証ポイント**:
- マージ結果にコンフリクト情報が含まれる
- コンフリクトファイルのリストが正確

#### TC-INT-006: コンフリクトなしの場合、Resolverがスキップされる

```typescript
it('TC-INT-006: should skip resolver when no conflicts', async () => {
  // Arrange
  const mockGitService = {
    merge: async () => ({
      success: true,
      conflictFiles: [],
      message: 'Merge successful'
    })
  };
  
  // Act
  const mergeResult = await mockGitService.merge();
  
  // Assert: Resolverが不要
  expect(mergeResult.conflictFiles).toHaveLength(0);
  expect(mergeResult.success).toBe(true);
});
```

**検証ポイント**:
- マージが成功した場合、コンフリクト解決ロジックをスキップ可能

#### TC-INT-007: ファイルコンテンツが正しくResolverに渡される

```typescript
it('TC-INT-007: should pass file content correctly to resolver', async () => {
  // Arrange: ファイルコンテンツを用意
  const fileContent = `line 1
<<<<<<< HEAD
custom code
=======
upstream code
>>>>>>> upstream/main
line 2`;
  
  const conflictResolver = new ConflictResolver(mockLogger);
  
  // Act: ファイルコンテンツを解析
  const markers = await conflictResolver.detectConflicts(fileContent);
  
  // Assert: マーカーが正しく検出される
  expect(markers).toHaveLength(1);
  expect(markers[0].ours).toBe('custom code');
  expect(markers[0].theirs).toBe('upstream code');
});
```

**検証ポイント**:
- ファイルコンテンツがResolverに正しく渡される
- マーカー検出が正確に動作

#### TC-INT-008: エラーが正しく伝播される

```typescript
it('TC-INT-008: should propagate error from GitService', async () => {
  // Arrange: エラーが発生する状況
  const mockGitService = {
    merge: async () => {
      throw new Error('Git merge failed');
    }
  };
  
  // Act & Assert
  expect(async () => {
    await mockGitService.merge();
  }).toThrow();
});
```

**検証ポイント**:
- GitServiceでのエラーが正しく伝播される
- エラーハンドリングが適切

---

### Test Suite 3: ConflictResolver → ReportGenerator

**ファイル**: `resolver-to-report.test.ts`  
**テスト数**: 4個  
**焦点**: コンフリクト解決結果がReportGeneratorに正しく渡される

#### TC-INT-009: 解決結果がレポート生成に使用される

```typescript
describe('ConflictResolver → ReportGenerator', () => {
  it('TC-INT-009: should use resolver result in report generation', () => {
    // Arrange: 解決結果を用意
    const resolveResult = {
      autoResolved: ['src/config.ts', 'src/utils.ts'],
      manualRequired: ['src/main.ts'],
      totalConflicts: 3
    };
    
    const reportGenerator = new ReportGenerator(mockLogger);
    
    // Act: レポート生成
    const report = reportGenerator.generateCLISummary(resolveResult);
    
    // Assert: レポートに解決結果が反映される
    expect(report).toContain('自動解決されたファイル数: 2 件');
    expect(report).toContain('手動解決が必要なファイル数: 1 件');
  });
});
```

**検証ポイント**:
- ConflictResolverの結果がReportGeneratorに正しく渡される
- 解決数がレポートに正しく反映される

#### TC-INT-010: 0件のコンフリクトケースのレポート生成

```typescript
it('TC-INT-010: should generate report for zero conflicts', () => {
  // Arrange
  const resolveResult = {
    autoResolved: [],
    manualRequired: [],
    totalConflicts: 0
  };
  
  const reportGenerator = new ReportGenerator(mockLogger);
  
  // Act
  const report = reportGenerator.generateCLISummary(resolveResult);
  
  // Assert: 0件の場合のレポートが生成される
  expect(report).toContain('コンフリクトはありません');
});
```

**検証ポイント**:
- 0件のコンフリクトの場合、適切なメッセージが生成される

#### TC-INT-011: ファイルリストがレポートに含まれる

```typescript
it('TC-INT-011: should include file list in report', () => {
  // Arrange
  const resolveResult = {
    autoResolved: ['src/config.ts'],
    manualRequired: ['src/main.ts'],
    totalConflicts: 2
  };
  
  const reportGenerator = new ReportGenerator(mockLogger);
  
  // Act
  const report = reportGenerator.generateCLISummary(resolveResult);
  
  // Assert: ファイルリストが含まれる
  expect(report).toContain('src/config.ts');
    expect(report).toContain('src/main.ts');
});
```

**検証ポイント**:
- ファイルリストがレポートに含まれる
- ファイルパスが正確に反映される

#### TC-INT-012: ログファイルが生成される

```typescript
it('TC-INT-012: should generate log file with resolver result', async () => {
  // Arrange
  const resolveResult = {
    autoResolved: ['src/config.ts'],
    manualRequired: [],
    totalConflicts: 1
  };
  
  const mockLogs = [
    { level: 'INFO', message: 'Starting merge', timestamp: '2025-10-19T10:00:00Z' },
    { level: 'INFO', message: 'Merge completed', timestamp: '2025-10-19T10:00:05Z' }
  ];
  
  const reportGenerator = new ReportGenerator(mockLogger);
  
  // Act: ログファイル生成
  const logPath = await reportGenerator.generateLogFile(resolveResult, mockLogs);
  
  // Assert: ログファイルが生成される
  expect(logPath).toBeDefined();
  expect(logPath).toMatch(/merge-report-\d{8}-\d{6}\.log/);
});
```

**検証ポイント**:
- ログファイルが生成される
- ファイル名形式が正確（YYYYMMDD-HHMMSS）

---

## 📝 実装順序

### Phase 1: 基本的な連携テスト（今日実装）

1. **TC-INT-001～004**: ConfigManager → GitService テスト
2. **TC-INT-005～008**: GitService → ConflictResolver テスト
3. **TC-INT-009～012**: ConflictResolver → ReportGenerator テスト

### Phase 2: エッジケーステスト（次日予定）

- エラーハンドリング
- データ変換エッジケース
- ログ出力検証

### Phase 3: 完全なフロー統合テスト（その次の日予定）

- 設定読み込みからレポート生成までの完全なフロー
- 複数のシナリオ（正常系、異常系）

---

## 🔧 テスト実装上の注意点

### 1. モック戦略

```typescript
// 実装例
class MockGitService {
  async merge() {
    return {
      success: false,
      conflictFiles: ['src/main.ts'],
      message: 'Conflict detected'
    };
  }
}
```

### 2. テンポラリディレクトリ

```typescript
// ファイルI/Oテストの場合
beforeEach(() => {
  tempDirManager = new TempDirManager();
});

afterEach(() => {
  tempDirManager.cleanup();
});
```

### 3. ロギング検証

```typescript
// ログが正しく記録されているか検証
const logs = mockLogger.getLogs();
expect(logs).toContainEqual(
  expect.objectContaining({
    level: 'INFO',
    message: expect.stringContaining('merge')
  })
);
```

---

## ✅ テスト実装チェックリスト

### ファイル作成

- [ ] `src/__tests__/integration/config-to-git.test.ts` を作成
- [ ] `src/__tests__/integration/git-to-resolver.test.ts` を作成
- [ ] `src/__tests__/integration/resolver-to-report.test.ts` を作成

### テスト実装

- [ ] TC-INT-001～004 を実装・PASS確認
- [ ] TC-INT-005～008 を実装・PASS確認
- [ ] TC-INT-009～012 を実装・PASS確認

### 実行・検証

- [ ] `bun test src/__tests__/integration` で全テスト実行
- [ ] すべてのテストが PASS している
- [ ] ログ出力が適切
- [ ] 実行時間が許容範囲内（< 20秒）

---

## 📊 成功基準

| 項目 | 基準 | 目標 |
|------|------|------|
| テストケース数 | 12個 | ✓ |
| PASS 率 | 100% | ✓ |
| 実行時間 | < 20秒 | ✓ |
| カバレッジ | モジュール間連携全網羅 | ✓ |

---

## 📚 参考資料

- **ユニットテスト実装完了**: `docs/08_worklogs/2025_10/20251019_04_phase-2-3-complete.md`
- **テスト実装戦略**: `docs/04_implementation/plans/upstream-merge-tool/20251019_04_test-implementation-strategy.md`
- **テストケース定義**: `docs/05_testing/test-cases/upstream-merge-tool-test-cases.md`

---

**作成日**: 2025-10-19  
**ステータス**: NOT-STARTED → IN-PROGRESS へ  
**次のアクション**: 統合テスト実装開始
