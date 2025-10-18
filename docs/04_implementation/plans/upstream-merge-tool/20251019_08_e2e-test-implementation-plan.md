# E2E テスト実装計画

**作成日**: 2025-10-19  
**タイトル**: E2Eテスト実装計画  
**ステータス**: 計画中

---

## 📋 概要

ユニットテスト・統合テスト完了後、E2Eテスト実装に進みます。
実機シナリオテストで、アプリケーション全体の動作を検証します。

---

## 🎯 実装目標

| 項目 | 目標 | 優先度 |
|------|------|--------|
| 正常系シナリオ | 3パターンをテスト | High |
| エラーケース | 4パターンをテスト | High |
| テスト実行速度 | 5秒以内に全テスト完了 | Medium |
| テストの再現性 | 環境に依存しない実装 | High |
| ドキュメント | 各シナリオのセットアップ方法を文書化 | Medium |

---

## 📐 テスト構成

### テストツール

- **フレームワーク**: Bun `bun:test` + TypeScript
- **テストリポジトリ**: 一時的なディレクトリに動的生成
- **検証方法**: CLI出力、ファイルシステム、Gitコマンド実行結果

### ファイル構成

```
src/__tests__/e2e/
├── setup.ts                          # テストヘルパー、テストリポジトリ作成
├── scenario-no-conflict.test.ts      # 正常系1: コンフリクトなし
├── scenario-auto-resolve.test.ts     # 正常系2: 自動解決
├── scenario-manual-resolve.test.ts   # 正常系3: 手動解決待ち
└── error-cases.test.ts               # エラーケース4パターン
```

---

## 🛠️ テストセットアップ (setup.ts)

### テストリポジトリ生成ヘルパー

```typescript
interface TestRepoConfig {
  name: string;
  hasUpstream?: boolean;
  upstreamChanges?: { [filePath: string]: string };
  localChanges?: { [filePath: string]: string };
  hasConflict?: boolean;
}

class TestRepoHelper {
  /**
   * 一時テストリポジトリを作成
   * @param config テストリポジトリ設定
   * @returns リポジトリパス
   */
  static async createTestRepo(config: TestRepoConfig): Promise<string>

  /**
   * テストリポジトリをクリーンアップ
   * @param repoPath リポジトリパス
   */
  static async cleanupTestRepo(repoPath: string): Promise<void>

  /**
   * マージツールを実行
   * @param repoPath リポジトリパス
   * @param configPath 設定ファイルパス
   * @returns { exitCode, stdout, stderr }
   */
  static async runMergeTool(repoPath: string, configPath: string): Promise<ToolResult>

  /**
   * ファイルをステージング状態で確認
   * @param repoPath リポジトリパス
   * @returns ステージング済みファイルリスト
   */
  static async getStagedFiles(repoPath: string): Promise<string[]>
}
```

### キー機能

1. **テストリポジトリ生成**
   - Upstreamリモート作成
   - Local ブランチ作成
   - 初期ファイル配置
   - 設定ファイル作成

2. **マージツール実行**
   - ツールの呼び出し
   - 出力キャプチャ
   - 終了コード取得

3. **クリーンアップ**
   - テストリポジトリ削除
   - 一時ファイル削除

---

## 📋 正常系シナリオ 1: コンフリクトなし

**ファイル**: `scenario-no-conflict.test.ts`

### セットアップ

```
Upstream: file.txt = "content from upstream"
Local:    file.txt = "content from upstream" (同一内容)
```

### 実行フロー

1. ツール実行
2. Upstreamから自動fetch
3. マージ実行（コンフリクトなし）
4. レポート生成

### 期待結果

| 検証項目 | 期待値 | 検証方法 |
|---------|--------|---------|
| 終了コード | 0 | $? == 0 |
| 出力メッセージ | 「マージが正常に完了」 | stdout に含む |
| コンフリクト数 | 0 | ログに「自動解決: 0」と表示 |
| ファイル状態 | ステージング済み | `git status` で確認 |
| ログレベル | ERROR なし | ログから ERROR 検出 |

### テストコード例

```typescript
it('should complete merge without conflicts', async () => {
  // Setup
  const repoPath = await TestRepoHelper.createTestRepo({
    name: 'no-conflict',
    hasUpstream: true,
    upstreamChanges: { 'file.txt': 'content' },
    localChanges: { 'file.txt': 'content' },
    hasConflict: false
  });

  // Execute
  const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

  // Assert
  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain('マージが正常に完了');
  expect(result.stdout).toContain('自動解決: 0');

  // Cleanup
  await TestRepoHelper.cleanupTestRepo(repoPath);
});
```

---

## 📋 正常系シナリオ 2: 自動解決可能なコンフリクト

**ファイル**: `scenario-auto-resolve.test.ts`

### セットアップ

```
Upstream: 変更なし
Local:    独自実装マーカー内で変更

例:
// CUSTOM-CODE-START
const value = 'custom implementation';
// CUSTOM-CODE-END
```

### 実行フロー

1. ツール実行
2. Upstreamから自動fetch
3. マージ実行（コンフリクト発生）
4. コンフリクト解決（自動）
5. レポート生成

### 期待結果

| 検証項目 | 期待値 | 検証方法 |
|---------|--------|---------|
| 終了コード | 0 | $? == 0 |
| 自動解決ファイル数 | 1 | ログに「自動解決: 1」 |
| ファイル状態 | ステージング済み | `git status` で確認 |
| ファイル内容 | マーカー削除、コンテンツ保持 | ファイル内容確認 |
| 手動解決待ちファイル | 0 | ログに「手動解決待ち: 0」 |

### テストコード例

```typescript
it('should auto-resolve conflicts within custom code markers', async () => {
  // Setup
  const repoPath = await TestRepoHelper.createTestRepo({
    name: 'auto-resolve',
    hasUpstream: true,
    upstreamChanges: { 'file.ts': 'export const x = 1;' },
    localChanges: { 
      'file.ts': `export const x = 1;
// CUSTOM-CODE-START
const custom = 'value';
// CUSTOM-CODE-END` 
    },
    hasConflict: true
  });

  // Execute
  const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

  // Assert
  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain('自動解決: 1');
  
  const stagedFiles = await TestRepoHelper.getStagedFiles(repoPath);
  expect(stagedFiles).toContain('file.ts');

  // Cleanup
  await TestRepoHelper.cleanupTestRepo(repoPath);
});
```

---

## 📋 正常系シナリオ 3: 手動解決が必要なコンフリクト

**ファイル**: `scenario-manual-resolve.test.ts`

### セットアップ

```
Upstream: ファイル変更あり（マーカー外）
Local:    独自実装マーカー内で変更

例:
Upstreamが line 1 を変更 → コンフリクトマーカー発生
Localの line 10-15 は独自実装
```

### 実行フロー

1. ツール実行
2. Upstreamから自動fetch
3. マージ実行（コンフリクト発生）
4. 自動解決試行 → 失敗（Upstream側も変更）
5. 手動解決待ち状態でレポート生成

### 期待結果

| 検証項目 | 期待値 | 検証方法 |
|---------|--------|---------|
| 終了コード | 0 | $? == 0 |
| 手動解決待ちファイル数 | 1 | ログに「手動解決待ち: 1」 |
| ファイル状態 | ステージングなし | `git status` で unmerged |
| ファイル内容 | コンフリクトマーカー含む | ファイル内容確認 |
| 自動解決ファイル数 | 0 | ログに「自動解決: 0」 |

### テストコード例

```typescript
it('should detect conflicts requiring manual resolution', async () => {
  // Setup
  const repoPath = await TestRepoHelper.createTestRepo({
    name: 'manual-resolve',
    hasUpstream: true,
    upstreamChanges: { 'file.ts': 'export const upstream = true;\nconst x = 1;' },
    localChanges: { 
      'file.ts': `export const custom = true;
// CUSTOM-CODE-START
const value = 'local';
// CUSTOM-CODE-END
const x = 1;` 
    },
    hasConflict: true
  });

  // Execute
  const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

  // Assert
  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain('手動解決待ち: 1');

  const stagedFiles = await TestRepoHelper.getStagedFiles(repoPath);
  expect(stagedFiles).not.toContain('file.ts');

  // Cleanup
  await TestRepoHelper.cleanupTestRepo(repoPath);
});
```

---

## 📋 エラーケース

**ファイル**: `error-cases.test.ts`

### エラーケース 1: 設定ファイルなし

#### セットアップ
- config.json を作成しない

#### 期待結果
- 終了コード: 1
- エラーメッセージ: 「設定ファイルが見つかりません」

### エラーケース 2: 不正な設定ファイル

#### セットアップ
```json
{
  "upstream_repository_name": "upstream"
  // 必須項目不足
}
```

#### 期待結果
- 終了コード: 1
- エラーメッセージ: 「必須項目が不足しています: upstream_branch_name」

### エラーケース 3: Gitリポジトリでない

#### セットアップ
- Gitリポジトリ外で実行

#### 期待結果
- 終了コード: 1
- エラーメッセージ: 「Not in a git repository」

### エラーケース 4: 無効なリモート名

#### セットアップ
```json
{
  "upstream_repository_name": "nonexistent",
  "upstream_branch_name": "main",
  ...
}
```

#### 期待結果
- 終了コード: 1
- エラーメッセージ: Gitエラー（例: 「no remote named 'nonexistent'」）

---

## 📊 テスト実行スケジュール

| フェーズ | 実装内容 | 所要時間 | 完了予定 |
|---------|--------|---------|---------|
| 1日目 | setup.ts、シナリオ1-2実装 | 4時間 | 2025-10-19 |
| 2日目 | シナリオ3、エラーケース実装 | 3時間 | 2025-10-20 |
| 3日目 | テスト修正、ドキュメント作成 | 2時間 | 2025-10-21 |

---

## ✅ 実装チェックリスト

### setup.ts 実装
- [ ] TestRepoHelper クラス作成
- [ ] createTestRepo メソッド実装
- [ ] runMergeTool メソッド実装
- [ ] getStagedFiles メソッド実装
- [ ] cleanupTestRepo メソッド実装

### scenario-no-conflict.test.ts
- [ ] テスト1: 基本的なマージ成功
- [ ] テスト2: 複数ファイル（コンフリクトなし）
- [ ] テスト3: ログレベル確認

### scenario-auto-resolve.test.ts
- [ ] テスト4: 単一ファイル自動解決
- [ ] テスト5: 複数ファイル自動解決
- [ ] テスト6: マーカーの完全な削除確認

### scenario-manual-resolve.test.ts
- [ ] テスト7: 単一ファイル手動解決待ち
- [ ] テスト8: 複数ファイル混在
- [ ] テスト9: コンフリクトマーカー保持確認

### error-cases.test.ts
- [ ] テスト10: 設定ファイルなし
- [ ] テスト11: 不正な設定（必須項目不足）
- [ ] テスト12: 不正な設定（形式エラー）
- [ ] テスト13: 非Gitリポジトリ
- [ ] テスト14: 無効なリモート名

### package.json
- [ ] `test:e2e` スクリプト追加
- [ ] `test:e2e:no-conflict` スクリプト追加
- [ ] `test:e2e:auto-resolve` スクリプト追加
- [ ] `test:e2e:manual-resolve` スクリプト追加
- [ ] `test:e2e:errors` スクリプト追加

### ドキュメント
- [ ] E2E テスト実装ガイド作成
- [ ] テスト実行手順書作成

---

## 🎯 成功基準

| 基準 | 評価 |
|------|------|
| 全E2Eテスト実行成功 | PASS 数 ≥ 13個 |
| テスト実行時間 | ≤ 10秒 |
| エラーメッセージの正確性 | すべてのエラーケースで適切なメッセージ表示 |
| ファイルシステムのクリーンアップ | テスト終了後、一時ファイル削除確認 |
| ドキュメント完成度 | すべてのシナリオの実行手順を文書化 |

---

## 📚 関連ドキュメント

- `docs/05_testing/test-cases/upstream-merge-tool-test-cases.md` - テストケース定義
- `docs/04_implementation/plans/upstream-merge-tool/20251019_01_implementation-plan.md` - 実装計画
- `docs/08_worklogs/2025_10/20251019_07_integration-test-complete.md` - 統合テスト完了レポート

---

**作成日**: 2025-10-19  
**ステータス**: 計画完了、実装開始予定
