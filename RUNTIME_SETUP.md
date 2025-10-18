# npm/yarn での実行方法

**作成日**: 2025-10-19  
**ステータス**: ✓ COMPLETE

---

## 📋 環境要件

### Node.js 環境
- **Node.js**: v18.0.0 以上
- **npm**: v9.0.0 以上、または **yarn**: v3.0.0 以上
- **Git**: インストール済み（マージ操作用）

### Bun 環境
- **Bun**: v1.2.15 以上（オプション）

---

## 🚀 インストール

### Step 1: プロジェクトをクローン/配置

```bash
# プロジェクトをディレクトリごと配置
cd /path/to/project
```

### Step 2: 依存関係をインストール

#### npm の場合
```bash
npm install
```

#### yarn の場合
```bash
yarn install
```

---

## 💻 実行方法

### npm を使用する場合

```bash
# 通常実行
npm run start

# 開発モード（--watch オプション付き）
npm run dev

# Bun を使用する場合
npm run start:bun
```

### yarn を使用する場合

```bash
# 通常実行
yarn start

# 開発モード
yarn dev
```

### 直接実行（Bun がインストールされている場合）

```bash
bun run index.ts
```

---

## 🧪 テスト実行

### npm でテストを実行

```bash
# 全テスト
bun test

# ユニットテストのみ
bun test src/__tests__/unit

# 特定モジュールのテスト
bun test src/__tests__/unit/logger.test.ts
```

### 利用可能なテストコマンド

```bash
npm run test              # 全テスト（Bun）
npm run test:unit        # ユニットテストのみ（Bun）
npm run test:unit:logger # Logger テスト
npm run test:unit:config # ConfigManager テスト
npm run test:unit:git    # GitService テスト
npm run test:unit:conflict # ConflictResolver テスト
npm run test:unit:report # ReportGenerator テスト
npm run test:coverage    # テストカバレッジ
```

---

## ⚙️ 設定ファイル

### config.json

プロジェクトルートに `config.json` を配置します：

```json
{
  "upstream_repository_name": "upstream",
  "upstream_branch_name": "main",
  "last_merged_upstream_commit": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
  "custom_code_marker": {
    "start": "// === CUSTOM CODE START ===",
    "end": "// === CUSTOM CODE END ==="
  }
}
```

#### 設定項目の説明

| 項目 | 型 | 説明 |
|------|-----|------|
| `upstream_repository_name` | string | Upstream リモート名（通常は `upstream`） |
| `upstream_branch_name` | string | マージするブランチ名（通常は `main` または `master`） |
| `last_merged_upstream_commit` | string | 最後にマージされた upstream のコミットハッシュ（40文字の16進数） |
| `custom_code_marker.start` | string | カスタムコード開始マーカー |
| `custom_code_marker.end` | string | カスタムコード終了マーカー |

---

## 📂 プロジェクト構成

```
upstream-merge-tool/
├── src/                          # ソースコード
│   ├── main.ts                   # エントリーポイント
│   ├── logger/                   # ロギング機能
│   ├── config/                   # 設定管理
│   ├── git/                      # Git 操作
│   ├── conflict/                 # コンフリクト解決
│   ├── report/                   # レポート生成
│   ├── types/                    # TypeScript 型定義
│   ├── utils/                    # ユーティリティ
│   └── __tests__/                # テスト
├── config.json                   # 設定ファイル
├── package.json                  # npm 設定
├── tsconfig.json                 # TypeScript 設定
└── README.md                     # ドキュメント
```

---

## 🔧 トラブルシューティング

### エラー: "Not in a git repository"

**原因**: ツールが Git リポジトリの外で実行されている

**解決方法**:
```bash
cd /path/to/git/repository
npm run start
```

### エラー: "Configuration file not found"

**原因**: `config.json` が見つからない

**解決方法**:
```bash
# プロジェクトルートに config.json を作成
# ファイルの配置: ./config.json
```

### エラー: "Failed to load configuration: module not found"

**原因**: 依存関係がインストールされていない

**解決方法**:
```bash
npm install
# または
yarn install
```

### npm でテストが実行できない

**原因**: Bun がインストールされていない（テスト実行用）

**現在の対応**: テスト実行には Bun が必須です

**解決方法**:
```bash
# Bun をインストール
npm install -g bun

# テスト実行
npm run test:unit
```

---

## 📊 実行結果例

### 正常系（コンフリクトなし）

```
[2025-10-19T10:00:00.000Z] INFO  | === Upstream Merge Tool Started ===
[2025-10-19T10:00:00.100Z] INFO  | Loading configuration from: ./config.json
[2025-10-19T10:00:00.200Z] INFO  | Configuration loaded and validated successfully
[2025-10-19T10:00:00.300Z] INFO  | Git repository verified. Current branch: main
[2025-10-19T10:00:00.400Z] INFO  | Fetching from upstream repository...
[2025-10-19T10:00:02.000Z] INFO  | Git fetch completed successfully
[2025-10-19T10:00:02.100Z] INFO  | Starting merge of upstream/main...
[2025-10-19T10:00:03.000Z] INFO  | ✓ Merge completed successfully with no conflicts!
[2025-10-19T10:00:03.100Z] INFO  | === Upstream Merge Tool Completed ===
```

### コンフリクト検出時

```
[2025-10-19T10:00:00.000Z] INFO  | === Upstream Merge Tool Started ===
...
[2025-10-19T10:00:03.000Z] INFO  | Merge completed with 2 conflicted file(s)
[2025-10-19T10:00:03.100Z] INFO  | Phase 2: Attempting to auto-resolve conflicts...
[2025-10-19T10:00:03.500Z] INFO  | Successfully auto-resolved: src/file1.ts
[2025-10-19T10:00:04.000Z] INFO  | Manual resolution required for: src/file2.ts
[2025-10-19T10:00:04.100Z] INFO  | 1 file(s) auto-resolved, 1 file(s) require manual resolution
```

---

## 🎯 次のステップ

1. **Config ファイルを準備**: プロジェクトルートに `config.json` を配置
2. **依存関係をインストール**: `npm install`
3. **ツールを実行**: `npm run start`
4. **ログを確認**: 実行結果をチェック
5. **必要に応じてコンフリクトを手動解決**: マーカー外のコンフリクト対応

---

## 📚 関連ドキュメント

- **設計書**: `docs/03_design/architecture/upstream-merge-tool-architecture.md`
- **要件定義**: `docs/02_requirements/features/upstream-merge-tool-requirements.md`
- **テスト戦略**: `docs/04_implementation/plans/upstream-merge-tool/20251019_04_test-implementation-strategy.md`

---

## ✨ サポートされるランタイム

| ランタイム | サポート | 説明 |
|-----------|---------|------|
| **Node.js** | ✓ Yes | tsx でハイブリッド実行 |
| **Bun** | ✓ Yes | ネイティブ実行 |

---

**更新日**: 2025-10-19  
**バージョン**: 1.0.0
