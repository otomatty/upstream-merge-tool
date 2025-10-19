日付: 2025-10-19
実装者: AI Assistant
ステータス: 実装中

# E2E テスト強化実装計画

## 概要

統合テストまで完了したマージツールについて、E2E テストスイートを大幅に拡張・強化します。既存の E2E テスト（37 テスト）に加えて、バージョン追跡機能、複雑なコンフリクトシナリオ、パフォーマンス検証、大規模データセット処理など、包括的なエンドツーエンドテストを実装します。

## 実装目標

| 目標 | 詳細 | 優先度 |
|------|------|--------|
| **テストケース数の拡充** | 37 → 70+ テストケースに増加 | High |
| **バージョン追跡 E2E テスト** | 15+ テストケース追加 | High |
| **複雑コンフリクトシナリオ** | 10+ テストケース追加 | High |
| **パフォーマンス・スケーラビリティ検証** | 10+ テストケース追加 | Medium |
| **エラー処理・リカバリー検証** | 既存テストの強化 | High |
| **ドキュメント化** | 実装計画、テスト結果報告 | High |

## 実装計画

### Phase 1: バージョン追跡機能 E2E テスト (15 テスト)

#### ファイル: `src/__tests__/e2e/scenario-version-tracking.test.ts`

**テストグループ 1: Version Extraction Integration (5テスト)**

- [TC-E2E-V-001] Git tag からバージョン抽出 → マージ → レポート確認
- [TC-E2E-V-002] package.json からバージョン抽出 → マージ → レポート確認
- [TC-E2E-V-003] 手動バージョン指定でマージ → レポート確認
- [TC-E2E-V-004] タグなしリポジトリで commit ID にフォールバック
- [TC-E2E-V-005] バージョン追跡無効化でマージ実行

**テストグループ 2: Version Comparison in Reports (4テスト)**

- [TC-E2E-V-006] 旧バージョンと新バージョンの比較表示
- [TC-E2E-V-007] 複数コンフリクト時のバージョン情報追跡
- [TC-E2E-V-008] マージ前後でバージョン情報の一貫性確認
- [TC-E2E-V-009] レポートにバージョン差分が適切に記載

**テストグループ 3: Version Fallback Chain (4テスト)**

- [TC-E2E-V-010] tag → package.json フォールバック検証
- [TC-E2E-V-011] package.json → manual フォールバック検証
- [TC-E2E-V-012] すべてのメソッド失敗 → commit ID フォールバック
- [TC-E2E-V-013] フォールバック経路が正しくログに記録

**テストグループ 4: Configuration Variations (2テスト)**

- [TC-E2E-V-014] 複数ブランチを持つリポジトリでのバージョン抽出
- [TC-E2E-V-015] セマンティックバージョン形式の正確な抽出

### Phase 2: 複雑なコンフリクトシナリオ (12 テスト)

#### ファイル: `src/__tests__/e2e/scenario-complex-conflicts.test.ts`

**テストグループ 1: Multi-File Conflicts (4テスト)**

- [TC-E2E-C-001] 5+ ファイルに同時に発生したコンフリクト
- [TC-E2E-C-002] 異なるファイルの異なる箇所でのコンフリクト
- [TC-E2E-C-003] 一部ファイルは自動解決、一部は手動が必要
- [TC-E2E-C-004] ネストされたディレクトリ構造でのコンフリクト

**テストグループ 2: Custom Code Preservation (4テスト)**

- [TC-E2E-C-005] 複数の custom code marker 区間を保護
- [TC-E2E-C-006] Marker 内の複雑なコード（関数定義、import など）保護
- [TC-E2E-C-007] Nested marker 処理（marker 内の marker）
- [TC-E2E-C-008] 不正な marker ペア（開始のみ、終了のみ）の処理

**テストグループ 3: Upstream Changes Handling (4テスト)**

- [TC-E2E-C-009] Upstream でファイルが完全に削除された場合
- [TC-E2E-C-010] Upstream でファイルがリネームされた場合
- [TC-E2E-C-011] Upstream と Local で同じファイルに異なる変更
- [TC-E2E-C-012] 大規模な構造変更を含むマージ

### Phase 3: パフォーマンス・スケーラビリティ検証 (10 テスト)

#### ファイル: `src/__tests__/e2e/scenario-performance.test.ts`

**テストグループ 1: Large Dataset Processing (4テスト)**

- [TC-E2E-P-001] 大規模ファイル（10MB+）のマージ処理時間
- [TC-E2E-P-002] ファイル数が多い（1000+ ファイル）リポジトリ
- [TC-E2E-P-003] 深いネスト構造（100+ レベル）のディレクトリ
- [TC-E2E-P-004] 長い履歴（10000+ コミット）のリポジトリ

**テストグループ 2: Memory Efficiency (3テスト)**

- [TC-E2E-P-005] メモリ使用量が合理的範囲内か
- [TC-E2E-P-006] ガベージコレクション後のメモリ解放確認
- [TC-E2E-P-007] 複数回実行時のメモリリーク検出

**テストグループ 3: Concurrent Operations (3テスト)**

- [TC-E2E-P-008] 複数ツール実行時の競合検出
- [TC-E2E-P-009] 部分的に完了したマージの再実行
- [TC-E2E-P-010] Git lock ファイルによる競合処理

### Phase 4: 追加エラーケース・リカバリー (8 テスト)

#### ファイル: `src/__tests__/e2e/scenario-error-recovery.test.ts` (既存の error-cases.test.ts 拡張)

**テストグループ 1: Repository State Issues (3テスト)**

- [TC-E2E-E-001] Dirty working directory での実行
- [TC-E2E-E-002] Staged changes 存在時の実行
- [TC-E2E-E-003] Detached HEAD 状態での実行

**テストグループ 2: Network/Git Issues (3テスト)**

- [TC-E2E-E-004] Upstream remote に接続失敗
- [TC-E2E-E-005] Git operation timeout 時の処理
- [TC-E2E-E-006] Permission denied エラーの処理

**テストグループ 3: Recovery Mechanisms (2テスト)**

- [TC-E2E-E-007] 失敗後の rollback 検証
- [TC-E2E-E-008] 部分的完了からの recovery

## 実装詳細

### テスト環境の拡張

```typescript
// 既存の TestRepoHelper を拡張

export class AdvancedTestRepoHelper extends TestRepoHelper {
  // バージョン追跡シナリオ
  static async createVersionTrackingScenario()
  static async verifyVersionInReport()
  
  // 複雑なコンフリクト生成
  static async createMultiFileConflict()
  static async createNestedMarkerScenario()
  
  // パフォーマンス計測
  static async measureExecutionTime()
  static async measureMemoryUsage()
  
  // エラー状況の再現
  static async createDirtyWorkingDirectory()
  static async simulateNetworkFailure()
}
```

### モック・フィクスチャ拡張

**バージョン追跡用フィクスチャ**:
- セマンティックバージョン形式タグ (v1.0.0, v2.1.3 など)
- package.json with version field
- 異なるブランチ構造

**複雑コンフリクト用フィクスチャ**:
- 多数のファイル構成（JSON、TypeScript、Markdown 混在）
- ネストされた custom code marker
- Upstream で複数の変更種別（追加、削除、変更）

**パフォーマンステスト用フィクスチャ**:
- 大規模ファイル生成機能
- 多数の小ファイル生成
- 深いディレクトリ構造生成

## テスト実行

### 実行方法

```bash
# すべての E2E テスト実行
$ bun test src/__tests__/e2e/

# 特定の E2E テストカテゴリ実行
$ bun test src/__tests__/e2e/scenario-version-tracking.test.ts
$ bun test src/__tests__/e2e/scenario-complex-conflicts.test.ts
$ bun test src/__tests__/e2e/scenario-performance.test.ts
$ bun test src/__tests__/e2e/scenario-error-recovery.test.ts

# 詳細出力付きで実行
$ bun test --verbose src/__tests__/e2e/
```

### テストタイムアウト

各テストカテゴリの推定実行時間:

| カテゴリ | テスト数 | 推定時間 |
|---------|---------|--------|
| Version Tracking | 15 | 45 秒 |
| Complex Conflicts | 12 | 60 秒 |
| Performance | 10 | 120 秒 |
| Error Recovery | 8 | 40 秒 |
| **合計** | **70** | **≈ 4-5 分** |

## 期待される結果

### テスト成功時の達成項目

- ✅ バージョン追跡機能の完全な E2E 検証
- ✅ 複雑なコンフリクトシナリオの正確な処理
- ✅ パフォーマンス要件の確認
- ✅ エラー処理とリカバリーの検証
- ✅ 本番環境対応の準備完了

### テストカバレッジ

```
Unit Tests:         150+ テスト
Integration Tests:  40 テスト
E2E Tests:          70+ テスト（新規強化版）
──────────────────────────────
Total:              260+ テスト
```

## リスク・対策

| リスク | 対策 |
|--------|------|
| E2E テスト実行時間が長い | 並列実行の検討、slow test の最適化 |
| パフォーマンステストの不安定性 | 複数回実行、スローテスト特別処理 |
| テスト環境の リソース枯渇 | cleanup 処理の強化、temp dir 管理 |

## 関連ドキュメント

- `docs/02_requirements/features/upstream-merge-tool-requirements.md` - 要件定義
- `docs/05_testing/test-cases/upstream-merge-tool-test-cases.md` - テストケース定義
- `docs/08_worklogs/2025_10/20251019_14_integration-tests-implementation.md` - 統合テスト実装完了

## 実装スケジュール

| 日時 | 作業 | 完了予定 |
|------|------|--------|
| 本日 | Phase 1, 2 実装 | 30-40 分 |
| 本日 | Phase 3, 4 実装 | 20-30 分 |
| 本日 | すべてのテスト実行・検証 | 10-15 分 |
| 本日 | ドキュメント・レポート作成 | 10 分 |

## 次のステップ

1. Phase 1: バージョン追跡 E2E テスト実装
2. Phase 2: 複雑コンフリクト E2E テスト実装
3. Phase 3: パフォーマンス検証 E2E テスト実装
4. Phase 4: エラー処理 E2E テスト追加実装
5. すべてのテスト実行と結果確認
6. テスト結果レポート作成
