# Phase 2 実装計画: Vite 不要な Pure Electron セットアップ

**作成日**: 2025-10-19  
**ステータス**: 計画中  
**目標**: Vite を使わずに React を TypeScript + webpack で静的ビルドし、Pure Electron で実行

---

## 1. 問題点と解決方針

### 1.1 現在の問題

- package.json に Vite 依存がある（`dev:renderer` で Vite 起動）
- `dev-electron` が `wait-on http://localhost:5173` で Vite サーバー起動を待つ
- Vite サーバーがポート 5173 でホストされるため、複数プロセス管理が必要

### 1.2 解決方針

1. **レンダラープロセス（React UI）を webpack で静的ビルド**
   - `src/renderer/` を webpack でバンドル
   - HTML ファイルも webpack で処理
   - 開発環境でも静的ファイル出力（ホットリロード不要）

2. **開発環境を簡略化**
   - `npm run dev` で webpack を watch モードで実行
   - webpack が終了したら Electron を起動
   - 単一プロセスで Electron アプリを実行

3. **メインプロセスの webpack ビルドも統合**
   - `webpack.config.js` を複数エントリーポイント対応に更新
   - メインプロセス + レンダラープロセスを同時ビルド

---

## 2. 実装タスク

### 2.1 webpack 設定更新

- [ ] **webpack.config.js** を複数エントリーポイント対応に更新
  - `electron/main.ts` → `dist/electron/main.js`
  - `renderer/index.tsx` → `dist/renderer/bundle.js` と `dist/renderer/index.html`
  - HTML Webpack Plugin で HTML 生成

- [ ] **Preload スクリプト** を webpack で別エントリーとしてビルド
  - `electron/preload.ts` → `dist/electron/preload.js`

### 2.2 renderer/index.tsx の実装

- [ ] `src/renderer/index.tsx` を React Router + Redux（オプション）で実装
- [ ] Entry point で root element をマウント

### 2.3 Electron メインプロセス修正

- [ ] `src/electron/main.ts` を修正
  - 開発環境: `file://dist/renderer/index.html` を読み込む
  - 本番環境: `file://資源フォルダ/index.html` を読み込む
  - Preload スクリプトパスを `dist/electron/preload.js` に更新

### 2.4 package.json スクリプト更新

- [ ] `dev` スクリプト: webpack watch + Electron 起動のシーケンシャル実行
- [ ] `build:gui` スクリプト: webpack build → electron-builder のシーケンシャル実行
- [ ] Vite 関連スクリプト削除

### 2.5 UI ページ実装（Phase 2 本体）

- [ ] **ConfigPage**: 設定ファイルの読み込み・編集・保存
- [ ] **MergePage**: マージ処理の実行と進捗表示
- [ ] **ConflictPage**: 競合ファイルの表示と解決
- [ ] **ReportPage**: マージ結果のレポート表示

### 2.6 Tailwind CSS 統合

- [ ] webpack で PostCSS + Tailwind を処理
- [ ] `global.css` に Tailwind directive を追加

### 2.7 テスト & デバッグ

- [ ] webpack ビルド動作確認
- [ ] Electron 起動確認
- [ ] IPC 通信動作確認

---

## 3. ファイル構造（変更後）

```
webpack.config.js (更新)
  ├─ Entry: electron/main.ts → dist/electron/main.js
  ├─ Entry: electron/preload.ts → dist/electron/preload.js
  ├─ Entry: renderer/index.tsx → dist/renderer/bundle.js + index.html

src/
├─ electron/
│  ├─ main.ts (更新)
│  ├─ preload.ts (既存 ✅)
│  └─ ipc/
│     ├─ configHandlers.ts ✅
│     ├─ gitHandlers.ts ✅
│     ├─ conflictHandlers.ts ✅
│     └─ reportHandlers.ts ✅
│
├─ renderer/
│  ├─ index.tsx (更新: React マウント処理)
│  ├─ App.tsx ✅
│  ├─ components/ (拡張必要)
│  │  ├─ StatusBar.tsx ✅
│  │  ├─ ConfigForm.tsx (新規)
│  │  ├─ MergeProgress.tsx (新規)
│  │  ├─ ConflictResolver.tsx (新規)
│  │  └─ ReportView.tsx (新規)
│  ├─ pages/ (詳細実装)
│  │  ├─ ConfigPage.tsx (詳細実装)
│  │  ├─ MergePage.tsx (詳細実装)
│  │  ├─ ConflictPage.tsx (詳細実装)
│  │  └─ ReportPage.tsx (詳細実装)
│  ├─ hooks/
│  │  └─ useElectronIPC.ts ✅
│  └─ styles/
│     └─ global.css (更新: Tailwind directives)
│
└─ shared/
   └─ types/
      └─ ipc.ts ✅

public/
├─ index.html (削除: webpack で生成)

dist/
├─ electron/
│  ├─ main.js (webpack ビルド出力)
│  └─ preload.js (webpack ビルド出力)
├─ renderer/
│  ├─ index.html (webpack HtmlPlugin 出力)
│  ├─ bundle.js (React + Pages)
│  └─ styles/ (Tailwind CSS)
```

---

## 4. 実装順序

1. **webpack.config.js 更新** - 複数エントリーポイント対応
2. **package.json スクリプト更新** - Vite 削除、シーケンシャル実行
3. **src/renderer/index.tsx 更新** - React マウント処理
4. **src/electron/main.ts 更新** - dist パス対応
5. **UI ページ実装** - ConfigPage, MergePage, ConflictPage, ReportPage
6. **Tailwind CSS 統合** - webpack での PostCSS 処理
7. **動作確認** - dev, build, GUI 起動テスト

---

## 5. 次のステップ

次のセッションから実装を開始

---

## 6. 参考資料

- Webpack 複数エントリーポイント: https://webpack.js.org/concepts/entry-points/
- Html-webpack-plugin: https://github.com/jantimon/html-webpack-plugin
- Webpack React 構成: https://webpack.js.org/guides/jsx/
