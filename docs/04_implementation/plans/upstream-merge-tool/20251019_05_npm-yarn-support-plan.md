# 20251019_05_npm-yarn-support-plan

**作成日**: 2025-10-19  
**タイトル**: npm/yarn サポート実装計画  
**ステータス**: IN-PROGRESS

---

## 📋 要件確認

### 現在の状況
- **実行環境**: Bun専用
- **package.json**: `"module": "index.ts"` で Bun 設定
- **エントリーポイント**: `index.ts` → `src/main.ts`
- **ビルド**: Bun のビルドツール使用

### ユーザー要件
1. **Bun 不要**: npm/yarn でインストール可能
2. **ビルド不要**: TypeScript をそのまま実行
3. **直接実行**: `npm run start` または `yarn start` で動作
4. **ディレクトリ配置**: プロジェクト全体をディレクトリごと配置して実行

---

## 🎯 実装方針

### オプション 1: tsx/ts-node 使用（推奨）
**メリット**:
- TypeScript をそのまま実行
- ビルド不要
- npm/yarn で簡単にセットアップ可能

**デメリット**:
- Node.js が必要
- 実行速度は Bun より遅い

**実装方法**:
```bash
npm install --save-dev tsx
# または
npm install --save-dev ts-node
```

### オプション 2: Node.js 互換設定
**メリット**:
- 標準的な Node.js/npm 構成
- 多くの CI/CD サービスで動作

**デメリット**:
- 実行速度が遅い可能性
- Node.js バージョン 18+ 必須

---

## 🔧 実装ステップ

### Step 1: package.json 更新
```json
{
  "type": "module",
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0",
    "yarn": ">=3.0.0"
  },
  "scripts": {
    "start": "tsx src/main.ts",
    "dev": "tsx --watch src/main.ts",
    "test": "tsx node_modules/bun/bin/bun.js test"
  },
  "devDependencies": {
    "tsx": "^4.7.0",
    "typescript": "^5.3.0"
  }
}
```

### Step 2: index.ts 削除または更新
**現在**: `index.ts` は Bun 用エントリーポイント

**選択肢**:
- A: `index.ts` を削除、`src/main.ts` を直接実行
- B: `index.ts` を Node.js 用にリメイク

**推奨**: A - `index.ts` は Bun 専用として保持、npm は直接 `src/main.ts` を実行

### Step 3: 実行方法の統一
```bash
# Bun 使用時
bun run src/main.ts

# npm 使用時
npm run start  # → tsx src/main.ts

# yarn 使用時
yarn start     # → tsx src/main.ts
```

### Step 4: ドキュメント更新
- README.md に npm/yarn 使用方法を追記
- インストール手順を整理

---

## 📝 実装チェックリスト

- [ ] package.json に `tsx` を devDependency に追加
- [ ] `"scripts"` セクションを更新
- [ ] `"engines"` フィールドを追加（Node.js バージョン指定）
- [ ] README.md を更新
- [ ] npm/yarn でのインストール・実行テスト
- [ ] エラーハンドリング確認
- [ ] ドキュメント完備

---

## 🚀 実装予定

1. **即座**: package.json 更新、tsx 追加
2. **同日**: README.md 更新、テスト実行
3. **次フェーズ**: Node.js/npm サポート完全化

---

## 💡 補足

### 他の選択肢

**ts-node**:
- 実績が豊富
- tsx より設定が複雑な場合がある
- 非推奨傾向（tsx の方がモダン）

**node --loader**:
- tsx/ts-node 不要
- Node.js 標準機能のみ
- ESM サポート必要（Node.js 18+）

**Vite**:
- 開発サーバー機能
- 本ツールでは不要

---

**関連ドキュメント**:
- `docs/02_requirements/features/upstream-merge-tool-requirements.md`
- `docs/03_design/architecture/upstream-merge-tool-architecture.md`

**次のマイルストーン**: npm/yarn サポート実装（2025-10-19）
