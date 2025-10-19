# upstream-merge-tool

Automatically merge upstream changes while preserving custom code with intelligent conflict resolution.

## 📃 概要

`upstream-merge-tool` は、フォークしたリポジトリやローカル修正を含むプロジェクトで、上流（Upstream）からの変更を自動的にマージする際に、ローカルのカスタムコードを保持する必要があるシナリオに対応しています。

**主な特徴：**
- ✅ 自動競合検出と条件付き自動解決
- ✅ カスタムコードマーカー（`// CUSTOM-CODE-START` ～ `// CUSTOM-CODE-END`）対応
- ✅ Upstream バージョン追跡機能（タグ、package.json、手動指定に対応）
- ✅ 3 つのシナリオに対応：
  - **No Conflict**: 競合なしの通常マージ
  - **Auto-Resolvable**: 自動解決可能な競合
  - **Manual Resolution**: 手動解決が必要な競合
- ✅ 詳細なマージレポート生成（バージョン情報を含む）
- ✅ Node.js / npm / yarn / Bun に対応
- ✅ 213 個のテストケース（ユニット・統合・E2E）で完全検証

## 🚀 クイックスタート

### 必要な環境

- **Git**: マージ操作に必須
- **Node.js** v18.0.0+（npm/yarn の場合）
  または
- **Bun** v1.2.15+（Bun ランタイムの場合）

### 1. 依存関係のインストール

```bash
# npm を使う場合
npm install

# yarn を使う場合
yarn install

# Bun を使う場合
bun install
```

### 2. 設定ファイルの作成

プロジェクトルートに `config.json` を作成します：

```json
{
  "upstream_repository_name": "upstream",
  "upstream_branch_name": "main",
  "last_merged_upstream_commit": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
  "custom_code_marker": {
    "start": "// CUSTOM-CODE-START",
    "end": "// CUSTOM-CODE-END"
  }
}
```

**設定項目の説明：**

| 項目 | 説明 | 例 |
|------|------|-----|
| `upstream_repository_name` | 上流リポジトリのリモート名 | `upstream` |
| `upstream_branch_name` | 上流ブランチ名 | `main` または `master` |
| `last_merged_upstream_commit` | 最後にマージした上流コミット SHA | `a1b2c3d...` (40 文字) |
| `last_merged_upstream_version` | 最後にマージした上流バージョン（オプション） | `v1.2.3` |
| `upstream_version_tracking` | バージョン追跡設定（オプション） | 下記参照 |
| `custom_code_marker.start` | カスタムコード開始マーカー | `// CUSTOM-CODE-START` |
| `custom_code_marker.end` | カスタムコード終了マーカー | `// CUSTOM-CODE-END` |

#### バージョン追跡設定（オプション）

バージョン情報を追跡することで、より分かりやすいマージレポートが生成されます：

```json
{
  "upstream_version_tracking": {
    "enabled": true,
    "type": "tag",
    "value": "v*"
  }
}
```

**バージョン追跡タイプ：**

- **`tag`**: Git タグから最新のセマンティックバージョンを自動取得（推奨）
- **`package`**: Upstream の `package.json` から version フィールドを取得
- **`manual`**: 手動で指定したバージョン文字列を使用

**フォールバック動作：**
- Primary 方式が失敗した場合、他の方法を自動的に試行
- すべての方法が失敗した場合は、コミット ID にフォールバック
- バージョン追跡がエラーになっても、マージ処理は継続

### 3. ツールの実行

```bash
# npm
npm run start

# yarn
yarn start

# Bun
bun run index.ts
```

## 📋 設定の詳細ガイド

### Upstream リモートの設定

```bash
# 現在のリモート確認
git remote -v

# 上流リモートがない場合は追加
git remote add upstream https://github.com/original-repo/repository.git

# 上流からの最新情報を取得
git fetch upstream
```

### コミット SHA の確認

```bash
# 上流の最新コミット SHA を確認
git log upstream/main --oneline -1

# または、特定のコミット SHA を確認
git rev-parse upstream/main
```

### カスタムコードマーカーの使用例

```typescript
// app.ts

export const config = { version: '2.0.0' };

// CUSTOM-CODE-START
// ローカルでのみ使用する設定
export const LOCAL_SETTINGS = {
  debug: true,
  apiUrl: 'http://localhost:3000'
};
// CUSTOM-CODE-END

export function initialize() {
  console.log('Initializing...');
}
```

### バージョン追跡の設定例

#### 例 1: Git タグを使用（推奨）

```json
{
  "upstream_repository_name": "upstream",
  "upstream_branch_name": "main",
  "last_merged_upstream_commit": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
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

**結果：** マージレポートに「v1.2.0 → v1.3.0」のように表示

#### 例 2: package.json から自動取得

```json
{
  "upstream_repository_name": "upstream",
  "upstream_branch_name": "main",
  "last_merged_upstream_commit": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
  "upstream_version_tracking": {
    "enabled": true,
    "type": "package"
  },
  "custom_code_marker": {
    "start": "// CUSTOM-CODE-START",
    "end": "// CUSTOM-CODE-END"
  }
}
```

**結果：** Upstream の package.json から version フィールドを自動抽出

#### 例 3: 手動指定

```json
{
  "upstream_repository_name": "upstream",
  "upstream_branch_name": "main",
  "last_merged_upstream_commit": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
  "upstream_version_tracking": {
    "enabled": true,
    "type": "manual",
    "value": "release-2025-10-19"
  },
  "custom_code_marker": {
    "start": "// CUSTOM-CODE-START",
    "end": "// CUSTOM-CODE-END"
  }
}
```

**結果：** 指定したバージョン文字列をそのまま使用

#### 例 4: バージョン追跡を無効化（従来の動作）

```json
{
  "upstream_repository_name": "upstream",
  "upstream_branch_name": "main",
  "last_merged_upstream_commit": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
  "upstream_version_tracking": {
    "enabled": false
  },
  "custom_code_marker": {
    "start": "// CUSTOM-CODE-START",
    "end": "// CUSTOM-CODE-END"
  }
}
```

**結果：** バージョン情報は使用されず、既存のコミット ID ベースで動作

## 🎯 使用シナリオ

### シナリオ 1: 競合なし

上流の変更とローカルの変更が別のファイルやセクションにある場合、自動的にマージされます。

```bash
$ npm run start
[INFO] Starting upstream merge...
[INFO] Fetching from upstream...
[SUCCESS] Merge completed successfully
[REPORT] Total Conflicts: 0
```

### シナリオ 2: 自動解決可能

上流が変更していない部分で、ローカルにカスタムコードマーカーで囲まれたコードがある場合、自動的に解決されます。

```
Upstream の変更:   export const x = 1;
Local の変更:      export const x = 1;
                   // CUSTOM-CODE-START
                   const custom = 'value';
                   // CUSTOM-CODE-END

結果:              自動解決 ✓ (マーカーが削除される)
```

### シナリオ 3: 手動解決が必要

上流とローカルの両方が同じセクションを変更した場合、手動でマージレポートを確認して解決します。

```
Upstream の変更:   export const x = 1;
Local の変更:      export const x = 999;

結果:              手動解決 ✗ (ユーザーが確認して解決)
```

## 📊 マージレポートの解釈

ツール実行後、以下のようなレポートが表示されます：

```
╔═══════════════════════════════════════════════════════════════╗
║                   Upstream Merge Report                       ║
╚═══════════════════════════════════════════════════════════════╝

Status: SUCCESS / FAILURE
Total Conflicts: X

Auto-Resolved (X files):
✓ src/config/settings.ts
✓ src/utils/helpers.ts

Manual Resolution Required (X files):
✗ src/main.ts
✗ src/api/client.ts

Execution Time: 1.234s
```

**フィールドの説明：**
- **Status**: 全体的なマージ結果
- **Total Conflicts**: 検出された競合数
- **Auto-Resolved**: 自動的に解決されたファイル
- **Manual Resolution Required**: 手動対応が必要なファイル

## 🧪 テストの実行

```bash
# すべてのテストを実行
bun test

# 特定のカテゴリのみ実行
bun test src/__tests__/unit          # ユニットテスト
bun test src/__tests__/integration   # 統合テスト
bun test src/__tests__/e2e           # E2E テスト

# 特定のテストファイルを実行
bun test src/__tests__/unit/config-manager.test.ts

# テスト結果の統計
bun test --summary
```

**テスト統計（2025-10-19）:**
- ✅ ユニットテスト: 150 個
- ✅ 統合テスト: 26 個
- ✅ E2E テスト: 37 個
- **合計: 213 個テスト PASS**

## 🔧 利用可能なコマンド

```bash
# 実行
npm run start          # Node.js/npm で実行
npm run start:bun      # Bun で実行
npm run dev            # ウォッチモード

# テスト
npm run test           # すべてのテスト実行
npm run test:coverage  # カバレッジレポート生成

# ビルド（Bun 必須）
npm run build          # スタンドアロンバイナリ生成
```

## 🧪 Run Tests

```bash
# Run all tests
bun test

# Run unit tests only
bun test src/__tests__/unit

# Run integration tests only
bun test src/__tests__/integration

# Run E2E tests only
bun test src/__tests__/e2e

# Run specific test file
bun test src/__tests__/unit/config-manager.test.ts

# Test coverage report
npm run test:coverage
```

**テスト実績（2025-10-19）:**

| テストタイプ | テスト数 | 結果 |
|-------------|---------|------|
| ユニットテスト | 145 | ✅ 全て PASS |
| 統合テスト | 26 | ✅ 全て PASS |
| E2E テスト | 28 | ✅ 全て PASS |
| **合計** | **199** | **✅ 100% PASS** |

**E2E テストシナリオ:**
- ✅ Scenario 1 (No Conflict): 6 個テスト
- ✅ Scenario 2 (Auto-Resolvable): 6 個テスト
- ✅ Scenario 3 (Manual Resolution): 7 個テスト
- ✅ Error Cases: 9 個テスト

## 💡 トラブルシューティング

### Q: "fatal: refusing to merge unrelated histories" エラーが出る

**原因**: Upstream リモートと Local が異なるコミット履歴を持っている

**解決策**: このエラーは本ツール内で自動的に処理されます（`--allow-unrelated-histories` フラグ使用）

### Q: カスタムコードマーカーが削除されない

**原因**: マーカーの形式が `config.json` と一致していない

**確認方法**:
```bash
# config.json のマーカー形式を確認
cat config.json | grep -A2 "custom_code_marker"

# ソースコード内のマーカーと比較
grep "CUSTOM-CODE" src/**/*.ts
```

### Q: コミット SHA が見つからない

**原因**: `last_merged_upstream_commit` に無効な SHA が指定されている

**解決策**:
```bash
# 有効なコミット SHA を確認
git log upstream/main --format=%H -n 10

# 上流のブランチが存在するか確認
git branch -r | grep upstream
```

## 🛠️ ワークフロー例

### 基本的な使用フロー

```bash
# 1. プロジェクトをセットアップ
git clone <your-forked-repo>
cd upstream-merge-tool

# 2. 上流リモートを追加
git remote add upstream <original-repo-url>
git fetch upstream

# 3. 設定ファイルを作成
# config.json を編集（上記のガイドを参照）

# 4. ツールを実行
npm run start

# 5. レポートを確認
# - Auto-Resolved: 何もしなくて OK
# - Manual Resolution Required: 手動でマージを完了
```

### 手動解決の手順

```bash
# 1. ツール実行後、マージレポートで競合ファイルを確認

# 2. 競合ファイルを開く
nano src/conflicted-file.ts

# 3. Git の競合マーカーを手動で解決
# <<<<<<< HEAD
# ======= 
# >>>>>>> upstream/main
# この部分を編集して解決

# 4. ステージングしてコミット
git add src/conflicted-file.ts
git commit -m "Resolve merge conflict with upstream"

# 5. 必要に応じてカスタムコードマーカーを追加
```

## 📚 詳細ドキュメント

設定方法とトラブルシューティングについて詳しくは、以下を参照してください：

- [`RUNTIME_SETUP.md`](./RUNTIME_SETUP.md) - ランタイム環境の詳細設定
- `docs/02_requirements/features/` - 機能要件書
- `docs/03_design/` - システム設計ドキュメント
- `docs/04_implementation/` - 実装ガイド
- `docs/05_testing/` - テストケース仕様

## 🔧 Available Scripts

```bash
# 実行
npm run start          # Node.js で実行
npm run start:bun      # Bun で実行
npm run dev            # ウォッチモード

# テスト
npm run test           # すべてのテスト実行
npm run test:coverage  # カバレッジレポート

# ビルド（Bun 必須）
npm run build          # スタンドアロンバイナリ生成
```

## 📦 Project Structure

```
upstream-merge-tool/
├── src/
│   ├── main.ts                     # メインエントリーポイント
│   ├── config/ConfigManager.ts     # 設定管理
│   ├── git/GitService.ts           # Git 操作
│   ├── conflict/ConflictResolver.ts # 競合解決
│   ├── report/ReportGenerator.ts   # レポート生成
│   ├── logger/Logger.ts            # ロギング
│   ├── types/                      # TypeScript 型定義
│   ├── utils/                      # ユーティリティ
│   └── __tests__/                  # テストスイート
│       ├── unit/                   # ユニットテスト (145 個)
│       ├── integration/            # 統合テスト (26 個)
│       └── e2e/                    # E2E テスト (28 個)
├── config.json                      # 設定ファイル
├── package.json                     # npm 設定
├── tsconfig.json                    # TypeScript 設定
├── docs/                           # ドキュメント
│   ├── 02_requirements/            # 要件定義
│   ├── 03_design/                  # 設計ドキュメント
│   ├── 04_implementation/          # 実装計画
│   └── 05_testing/                 # テスト仕様
└── README.md                        # このファイル
```

## ✨ Features

- ✅ 自動上流マージ
- ✅ スマート競合検出
- ✅ カスタムコードマーカー対応
- ✅ 条件付き自動解決
- ✅ Upstream バージョン追跡機能
- ✅ 詳細なレポート生成（バージョン情報を含む）
- ✅ Node.js と Bun 両対応
- ✅ 213 個の包括的なテスト (100% PASS)

## 🔄 バージョン追跡機能ガイド

### バージョン追跡とは

上流リポジトリのバージョン情報を自動的に取得・追跡することで、マージレポートにバージョン情報を含めることができます。これにより「v1.2.0 から v1.3.0 へのマージ」のようにユーザーにとってわかりやすいレポートが生成されます。

### 動作仕様

#### 優先順位

1. **タグから取得**: Git タグの中から最新のセマンティックバージョン（v1.2.3 形式）を自動抽出
2. **package.json から取得**: Upstream リポジトリの `package.json` ファイルから version フィールドを抽出
3. **手動指定**: 設定ファイルで直接指定したバージョン文字列を使用
4. **フォールバック**: すべての方法が失敗した場合、既存のコミット ID を使用

#### 失敗耐性

- バージョン取得がエラーになっても、**マージ処理は継続**
- 警告ログを出力し、コミット ID を代替として使用
- バージョン追跡設定がなくても、**後方互換性を保証**（既存の config.json はそのまま使用可能）

### マージレポート例

バージョン追跡を有効にした場合、レポート出力に以下のようにバージョン情報が含まれます：

```
============================================================
UPSTREAM MERGE TOOL REPORT
============================================================
Execution Time: 2025-10-19T00:14:02.089Z
Duration: 2s
Status: ✓ SUCCESS

VERSION INFORMATION:
------------------------------------------------------------
Previous Version: v1.2.0
Current Version: v1.3.0
Source: tag

CONFLICT SUMMARY:
------------------------------------------------------------
Total Conflicts: 0
Auto-Resolved: 0
Manual Required: 0

============================================================
```

### トラブルシューティング

#### バージョン取得が失敗する場合

```bash
# Git タグの確認
git tag -l | grep "v"

# 特定のリモートのタグを確認
git ls-remote --tags upstream | grep "v"

# package.json の確認
git show upstream/main:package.json | jq '.version'
```

#### バージョン追跡を一時的に無効化

```json
{
  "upstream_version_tracking": {
    "enabled": false
  }
}
```

## 🎯 次のステップ

1. **[クイックスタート](#-クイックスタート)** セクションに従って環境をセットアップ
2. **[設定の詳細ガイド](#-設定の詳細ガイド)** で `config.json` を作成
3. **[バージョン追跡機能ガイド](#-バージョン追跡機能ガイド)** でバージョン情報の設定を検討
4. **[使用シナリオ](#-使用シナリオ)** で自分の状況に合わせた方法を確認
5. ツールを実行してマージを完了

## 📝 ライセンス

MIT

---

**開発情報**: このツールは完全にテストされ、213 個のテストケース（ユニット・統合・E2E）で 100% PASS しています。

詳細なドキュメント：
- **要件定義**: `docs/02_requirements/features/upstream-version-tracking-requirements.md`
- **アーキテクチャ設計**: `docs/03_design/architecture/upstream-merge-tool-architecture.md`
- **テストケース**: `docs/05_testing/test-cases/upstream-merge-tool-test-cases.md`
