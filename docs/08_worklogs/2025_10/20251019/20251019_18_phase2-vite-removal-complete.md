# Phase 2 実装進捗: Vite 削除 & Pure Electron セットアップ

**作成日**: 2025-10-19  
**ステータス**: Phase 2-1 Vite 削除完了

---

## 1. 完了した作業

### 1.1 Vite 関連の削除

- [x] vite.config.ts ファイル削除
- [x] package.json から Vite スクリプト削除
  - `dev:renderer: vite` → 削除
  - `dev:electron: wait-on` → 削除
  - `build:renderer: vite build` → 削除
  - `dev: concurrently` → シンプルな webpack watch に変更
  - `build:gui` → webpack + electron-builder に統一
- [x] devDependencies から削除
  - `vite: ^5.4.20` → 削除
  - `@vitejs/plugin-react: ^4.7.0` → 削除
  - `wait-on: ^7.2.0` → 削除
- [x] bun remove で依存関係を最新化

### 1.2 webpack の複数エントリーポイント化

- [x] webpack.config.js を複数エントリーポイント対応に更新
  - `entry: './src/electron/main.ts'` → 配列形式で 3 つのエントリーポイント
  - **Main Process**: `src/electron/main.ts` → `dist/electron/main.js`
  - **Preload**: `src/electron/preload.ts` → `dist/electron/preload.js`
  - **Renderer**: `src/renderer/index.tsx` → `dist/renderer/bundle.js`
- [x] html-webpack-plugin で HTML 生成
  - `public/index.html` → `dist/renderer/index.html` に自動コピー

### 1.3 webpack ビルド用プラグイン追加

- [x] `html-webpack-plugin@5.6.4` インストール
- [x] `style-loader@4.0.0` インストール（CSS-in-JS）
- [x] `css-loader@7.1.2` インストール（CSS モジュール）
- [x] `postcss-loader@8.2.0` インストール（PostCSS/Tailwind）

### 1.4 Electron メインプロセス修正

- [x] `src/electron/main.ts` を Vite 不要に修正
  - `isDev ? 'http://localhost:5173'` → 削除
  - 常に `file://dist/renderer/index.html` を読み込む（開発も本番も同じ）
  - dev モードでも webpack の出力を使用

### 1.5 HTML テンプレート修正

- [x] `public/index.html` のスクリプトタグ削除
  - `<script type="module" src="/src/renderer/index.tsx"></script>` → 削除
  - webpack が自動的に bundle.js を追加するため不要

### 1.6 webpack ビルドテスト

- [x] `bun webpack --config webpack.config.js --mode development` 実行 ✅ **成功**

**ビルド結果**:
```
✅ main (webpack 5.102.1) compiled successfully in 5289 ms
   - dist/electron/main.js (67.8 KiB)
   - dist/electron/main.js.map

✅ preload (webpack 5.102.1) compiled successfully in 3989 ms
   - dist/electron/preload.js (5.34 KiB)
   - dist/electron/preload.js.map

✅ renderer (webpack 5.102.1) compiled successfully in 6830 ms
   - dist/renderer/bundle.js (1.53 MiB)
   - dist/renderer/bundle.js.map
   - dist/renderer/index.html (289 bytes)
```

---

## 2. 技術的な改善点

### 2.1 シンプルなビルドパイプライン

**以前（Vite）**:
```
npm run dev
  ├─ vite (development server) :5173
  └─ wait-on http://localhost:5173
     └─ electron (waits for server)
```

複雑で、複数プロセス管理が必要

**改善後（Pure Webpack）**:
```
npm run dev
  ├─ webpack --watch
  └─ electron (once webpack is ready)
```

シンプルで、デバッグ容易。コンポーネント別に確認可能。

### 2.2 静的ビルドのメリット

- **キャッシング**: HTML 全体が静的ファイルのため、キャッシュ戦略が明確
- **デプロイ**: ファイルコピーだけで配布可能
- **サイズ**: Vite サーバーの overhead がない（開発環境でも軽量）
- **ホットリロード不要**: デスクトップアプリのため不要

---

## 3. ビルド出力の確認

```
dist/
├── electron/
│   ├── main.js (67.8 KiB)
│   ├── main.js.map
│   ├── preload.js (5.34 KiB)
│   └── preload.js.map
└── renderer/
    ├── index.html (289 bytes)
    ├── bundle.js (1.53 MiB)
    └── bundle.js.map
```

webpack により以下が実現:
- React + React Router が 1 ファイル（bundle.js）にバンドル
- Tailwind CSS が CSS-in-JS で処理
- TypeScript が JavaScript にコンパイル
- Source maps で開発環境でのデバッグ対応

---

## 4. 次のステップ (Phase 2-2)

### 4.1 開発環境の完全テスト

- [ ] `npm run dev` コマンドで webpack watch + Electron 起動を確認
- [ ] webpack watch 時の再ビルド確認
- [ ] Electron ウィンドウが正常に開くか確認
- [ ] React UI が表示されるか確認

### 4.2 UI ページの詳細実装

- [ ] **ConfigPage**: 設定ファイル管理 UI
- [ ] **MergePage**: マージ処理と進捗表示
- [ ] **ConflictPage**: 競合解決 UI
- [ ] **ReportPage**: マージ結果レポート

### 4.3 Tailwind CSS の最適化

- [ ] PurgeCSS でビルドサイズ最適化（本番環境）
- [ ] ダークモード対応（オプション）

### 4.4 本番ビルド & デプロイ

- [ ] `npm run build:gui` で本番ビルド
- [ ] electron-builder で macOS/Windows/Linux パッケージ生成
- [ ] アプリケーション署名（macOS）

---

## 5. 関連ドキュメント

- 計画書: `docs/04_implementation/plans/electron-gui/20251019_02_phase2-vite-free-setup.md`
- Phase 1: `docs/08_worklogs/2025_10/20251019_17_electron-gui-phase1-progress.md`

---

## 6. package.json スクリプト（更新後）

```json
"scripts": {
  "start": "electron .",
  "start:cli": "tsx src/main.ts",
  "dev": "webpack --config webpack.config.js --mode development --watch & sleep 2 && electron --inspect=5858 .",
  "build:gui": "webpack --config webpack.config.js --mode production && electron-builder",
  ...
}
```

**シンプルで分かりやすい構造へ改善**

---

## 7. ファイル変更サマリー

| ファイル | 変更内容 |
|---------|---------|
| `package.json` | Vite スクリプト削除、webpack のみに統一 |
| `webpack.config.js` | 複数エントリーポイント配列形式に変更 |
| `src/electron/main.ts` | Vite サーバーへの依存削除 |
| `public/index.html` | スクリプトタグ削除（webpack 自動挿入） |
| `vite.config.ts` | **削除** |

---

## 8. 次のセッション開始時の手順

1. `npm run dev` でビルド・Electron 起動テスト
2. React UI が表示されることを確認
3. IPC 通信の動作確認
4. UI ページの詳細実装開始
