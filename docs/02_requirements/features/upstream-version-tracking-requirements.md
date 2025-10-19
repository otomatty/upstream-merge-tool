# Upstream バージョン追跡機能 要件定義書

**作成日**: 2025-10-19  
**最終更新日**: 2025-10-19  
**版**: 1.0

---

## 1. 機能概要

Upstream リポジトリのバージョン情報（タグ、バージョン情報）を設定・追跡し、マージ対象の比較基準として利用する機能。これにより、単なるコミット ID よりもユーザーにとってわかりやすい比較・検証が可能になる。

### 1.1 背景・課題

- 現在は `last_merged_upstream_commit` でのみコミット SHA を追跡している
- コミット SHA では、マージ対象のバージョンがわかりにくい
- バージョン情報があれば、ユーザーが「v1.0 から v1.5 への変更」のように明確に把握できる

### 1.2 目指すゴール

- Upstream リポジトリのバージョン情報を追跡
- バージョン情報とコミット ID のフォールバック機構
- 比較・レポートでのバージョン情報の活用

---

## 2. 要件定義

### 2.1 機能要件

#### FR-1: バージョン情報の設定

**要件**:
- 設定ファイル (`config.json`) にバージョン情報を追加可能にする
- バージョン情報はオプション（指定がなくても動作する）
- 以下の形式に対応:
  1. **タグ形式**: `v1.2.3`、`v2.0.0` など（Git タグ）
  2. **package.json バージョン**: Upstream の `package.json` に記載されたバージョン
  3. **任意のバージョン文字列**: ユーザーが手動指定

#### FR-2: バージョン情報の取得

**要件**:
- Upstream リポジトリから最新のバージョン情報を取得
- 取得方法（優先度順）:
  1. Git タグから最新のセマンティックバージョンを抽出
  2. Upstream の `package.json` から version フィールドを抽出
  3. ユーザーが設定したバージョン文字列を使用
  4. 上記すべてが失敗した場合は、コミット SHA にフォールバック

#### FR-3: 優先順位ロジック

**要件**:
- 各操作（マージ、比較、検証）で以下の優先順位を適用:

```
1. 設定されたバージョン情報が有効な場合
   ├─ Git タグが取得できた場合 → タグを使用
   ├─ package.json が取得できた場合 → バージョンを使用
   └─ その他の場合 → 設定値を使用
2. バージョン情報取得がエラー or 設定が存在しない場合
   └─ 既存のコミット ID を使用（フォールバック）
```

#### FR-4: エラーハンドリング

**要件**:
- バージョン取得エラー時は警告をログに出力し、コミット ID で続行
- 設定ファイルのバージョン指定が無効な場合は検証エラー
- バージョン形式の検証（セマンティックバージョン対応時）

#### FR-5: レポート出力

**要件**:
- マージレポートに以下を含める:
  - 前回マージ時のバージョン情報
  - 今回マージするバージョン情報
  - バージョン間の差分概要（セマンティックバージョン対応時）

---

### 2.2 非機能要件

#### NFR-1: 後方互換性

- バージョン情報が設定されていない場合も完全に動作
- 既存の `config.json` はそのまま使用可能

#### NFR-2: パフォーマンス

- バージョン取得は最大 5 秒以内に完了
- タイムアウト時は自動的にコミット ID にフォールバック

#### NFR-3: 信頼性

- Upstream リポジトリ接続が失敗しても、コミット ID で代替
- 複数のバージョン取得方法により高い成功率を確保

---

## 3. 配置および動作仕様

### 3.1 設定ファイルのスキーマ

```json
{
  "upstream_repository_name": "upstream",
  "upstream_branch_name": "main",
  "last_merged_upstream_commit": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
  "last_merged_upstream_version": "v1.2.3",
  "upstream_version_tracking": {
    "enabled": true,
    "type": "tag",
    "value": "latest"
  },
  "custom_code_marker": {
    "start": "// CUSTOM-CODE-START",
    "end": "// CUSTOM-CODE-END"
  }
}
```

#### フィールド説明

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `last_merged_upstream_version` | string | ✗ | 最後にマージした際の Upstream バージョン |
| `upstream_version_tracking.enabled` | boolean | ✗ | バージョン追跡を有効にするか（デフォルト: `false`） |
| `upstream_version_tracking.type` | string | ✗ | バージョン取得方法（`tag`, `package`, `manual`） |
| `upstream_version_tracking.value` | string | ✗ | type が `manual` の場合のバージョン値、または `tag` の場合は検索パターン |

### 3.2 バージョン取得の詳細仕様

#### パターン 1: Git タグから取得 (`type: "tag"`)

```typescript
interface VersionTrackingConfig {
  enabled: true;
  type: "tag";
  value?: string; // デフォルト: "latest"、"v*" で検索
}
```

**動作**:
- Git タグの一覧を取得
- セマンティックバージョン形式 (`v?X.Y.Z`) のタグをフィルタ
- 最新のタグを抽出

**例**:
```bash
git tag -l 'v*' --sort=-version:refname --merged HEAD | head -1
```

#### パターン 2: package.json から取得 (`type: "package"`)

```typescript
interface VersionTrackingConfig {
  enabled: true;
  type: "package";
  value?: string; // デフォルト: "package.json"
}
```

**動作**:
- Upstream リポジトリの `package.json` を取得
- `version` フィールドを抽出

**例**:
```bash
git show upstream/main:package.json | jq -r '.version'
```

#### パターン 3: 手動指定 (`type: "manual"`)

```typescript
interface VersionTrackingConfig {
  enabled: true;
  type: "manual";
  value: string; // バージョン文字列を直接指定
}
```

**動作**:
- 設定に記載されたバージョン文字列をそのまま使用

### 3.3 バージョン情報の更新タイミング

- マージ成功時に `last_merged_upstream_version` を更新
- マージに失敗した場合は更新しない

---

## 4. 使用例

### 例 1: Git タグを使用したバージョン追跡

**config.json**:
```json
{
  "upstream_repository_name": "upstream",
  "upstream_branch_name": "main",
  "last_merged_upstream_commit": "a1b2c3d...",
  "last_merged_upstream_version": "v1.2.0",
  "upstream_version_tracking": {
    "enabled": true,
    "type": "tag"
  },
  "custom_code_marker": {
    "start": "// CUSTOM-CODE-START",
    "end": "// CUSTOM-CODE-END"
  }
}
```

**期待される動作**:
1. Git タグから最新版（例: `v1.3.0`）を取得
2. 前回マージ版（`v1.2.0`）と比較
3. レポートに「v1.2.0 → v1.3.0 へのマージ」と表示

### 例 2: package.json から自動取得

**config.json**:
```json
{
  "upstream_version_tracking": {
    "enabled": true,
    "type": "package"
  }
}
```

**期待される動作**:
1. Upstream の `package.json` から version を抽出（例: `2.0.0`）
2. コミット ID の代わりにバージョン情報を使用

### 例 3: バージョン追跡を無効化（デフォルト動作）

**config.json**:
```json
{
  "upstream_version_tracking": {
    "enabled": false
  }
}
```

**期待される動作**:
1. 既存のコミット ID ベースの処理を継続
2. バージョン情報は使用されない

---

## 5. 関連ドキュメント

- **アーキテクチャ設計書**: `docs/03_design/architecture/upstream-merge-tool-architecture.md`
- **テストケース**: `docs/05_testing/test-cases/upstream-merge-tool-test-cases.md`
- **実装計画**: `docs/04_implementation/plans/upstream-merge-tool/`

---

## 6. 受け入れ基準

- [ ] バージョン情報をオプションフィールドとして設定可能
- [ ] Git タグから最新バージョンを取得できる
- [ ] package.json から version フィールドを取得できる
- [ ] バージョン取得失敗時はコミット ID にフォールバック
- [ ] マージレポートにバージョン情報が含まれる
- [ ] 後方互換性が確保されている（既存設定での動作）
- [ ] ユニット・統合・E2E テストで検証済み
