# Phase 2-2 実装計画: UI ページの詳細実装

**作成日**: 2025-10-19  
**ステータス**: Phase 2-1 完了、Phase 2-2 開始準備  
**前提**: Pure Webpack Electron セットアップ ✅ 完了

---

## 1. 現在の状態

### 1.1 成功した点

✅ **Electron アプリ起動成功**
- `npm start` で Electron ウィンドウが開く
- React Router で `/config` ページが表示される（プレースホルダー）
- webpack で Main + Preload + Renderer を一括ビルド
- IPC 基盤が実装されている

### 1.2 問題点

- UI ページがプレースホルダーのまま（白い画面）
- React コンポーネントが未実装
- IPC 通信テストが未実施

---

## 2. 実装が必要な UI ページ

### 2.1 ConfigPage（設定ページ）

**目的**: リポジトリ設定ファイルの読み込み・編集・保存

**実装内容**:
```tsx
// src/renderer/pages/ConfigPage.tsx
- 設定ファイルパス入力フィールド
- 「ファイルを選択」ボタン
- 設定ファイル内容のテキストエリア（JSON 編集）
- バリデーション結果表示
- 「保存」ボタン
- 「次へ」ボタン → MergePage へ
```

**IPC 呼び出し**:
```typescript
await window.api.config.load(filePath)      // 設定ロード
await window.api.config.validate(config)    // バリデーション
await window.api.config.save(filePath, config) // 保存
```

### 2.2 MergePage（マージ実行ページ）

**目的**: Git マージ処理の実行と進捗表示

**実装内容**:
```tsx
// src/renderer/pages/MergePage.tsx
- 対象リポジトリ情報表示
- マージ対象リモート・ブランチ選択
- 「マージ開始」ボタン
- 進捗バー / ログ表示エリア
- ステータス表示（実行中 / 完了 / エラー）
- 「次へ」ボタン → ConflictPage へ
```

**IPC 呼び出し**:
```typescript
await window.api.git.fetch(remote)          // リモート取得
await window.api.git.merge(remote, branch)  // マージ実行
window.api.git.onProgress(callback)         // 進捗イベント
```

### 2.3 ConflictPage（競合解決ページ）

**目的**: マージ競合ファイルの表示と解決

**実装内容**:
```tsx
// src/renderer/pages/ConflictPage.tsx
- 競合ファイル一覧表示
- ファイル選択時に diff 表示
- 競合マーカー（<<<<<<<, ======, >>>>>>>）表示
- 解決戦略選択
  - "upstream" : upstream 版を採用
  - "local" : ローカル版を採用
  - "both" : 両方統合
- ファイルごとの解決ボタン
- 「次へ」ボタン → ReportPage へ
```

**IPC 呼び出し**:
```typescript
await window.api.conflict.list()             // 競合ファイル一覧
await window.api.conflict.getDiff(filePath)  // diff 取得
await window.api.conflict.resolve(fileId, strategy) // 解決
```

### 2.4 ReportPage（結果レポートページ）

**目的**: マージ結果のレポート表示

**実装内容**:
```tsx
// src/renderer/pages/ReportPage.tsx
- マージ結果サマリー
  - マージ件数
  - 競合解決件数
  - エラー件数
- マージされたファイル一覧
- 競合が解決されたファイル一覧
- エラーレポート
- 「詳細をダウンロード」ボタン
- 「終了」ボタン
```

**IPC 呼び出し**:
```typescript
await window.api.report.getSummary()  // サマリー取得
await window.api.report.getDetails()  // 詳細取得
```

---

## 3. 実装の優先順序

### Phase 2-2A: ConfigPage 実装（優先度 🔴 高）

1. **ConfigForm コンポーネント作成**
   ```
   src/renderer/components/ConfigForm.tsx
   - ファイルパス入力
   - ファイル選択ダイアログ（Electron API）
   - JSON エディタ
   - バリデーション表示
   ```

2. **ConfigPage を完全実装**
   ```
   src/renderer/pages/ConfigPage.tsx
   - ConfigForm コンポーネント使用
   - IPC で config:load, config:validate, config:save を呼び出し
   - エラーハンドリング表示
   ```

3. **テスト**
   ```
   - ファイル選択機能動作確認
   - IPC 通信確認
   - バリデーション動作確認
   ```

### Phase 2-2B: MergePage 実装（優先度 🟠 中）

1. **MergeProgress コンポーネント作成**
   ```
   src/renderer/components/MergeProgress.tsx
   - 進捗バー
   - ログメッセージ表示
   - ステータス表示
   ```

2. **MergePage を完全実装**
   ```
   src/renderer/pages/MergePage.tsx
   - git:fetch, git:merge 呼び出し
   - git:onProgress イベントリスナー登録
   - エラーハンドリング
   ```

3. **テスト**
   ```
   - 実際のリポジトリで git:merge テスト
   - 進捗イベント表示確認
   ```

### Phase 2-2C: ConflictPage 実装（優先度 🟠 中）

1. **DiffViewer コンポーネント作成**
   ```
   src/renderer/components/DiffViewer.tsx
   - diff 表示
   - ハイライト
   - 行番号表示
   ```

2. **ConflictResolver コンポーネント作成**
   ```
   src/renderer/components/ConflictResolver.tsx
   - 競合マーカー表示
   - 解決戦略選択ボタン
   ```

3. **ConflictPage を完全実装**
   ```
   src/renderer/pages/ConflictPage.tsx
   - conflict:list, conflict:getDiff, conflict:resolve 呼び出し
   ```

### Phase 2-2D: ReportPage 実装（優先度 🟡 低）

1. **ReportView コンポーネント作成**
   ```
   src/renderer/components/ReportView.tsx
   - サマリー表示
   - ファイル一覧表示
   - ダウンロード機能
   ```

2. **ReportPage を完全実装**
   ```
   src/renderer/pages/ReportPage.tsx
   - report:getSummary, report:getDetails 呼び出し
   ```

---

## 4. 各ページの Tailwind CSS スタイリング

### カラースキーム

```tailwind
- 背景: bg-gray-50 (ライト) / bg-gray-900 (ダーク)
- テキスト: text-gray-900 (ライト) / text-white (ダーク)
- アクセント: blue-600
- 成功: green-600
- エラー: red-600
- 警告: yellow-600
```

### 標準レイアウト

```tsx
<div className="flex flex-col h-screen">
  <div className="flex-1 overflow-auto bg-gray-50 p-8">
    {/* コンテンツ */}
  </div>
  <StatusBar currentStep={currentStep} />
</div>
```

---

## 5. テスト計画

### Unit Tests (src/__tests__/unit/renderer/)

- ConfigPage の IPC 呼び出しテスト
- MergePage の進捗イベント処理テスト
- ConflictPage の競合解決テスト
- ReportPage のレポート表示テスト

### Integration Tests (src/__tests__/integration/)

- IPC 通信の end-to-end テスト
- Config → Merge → Conflict → Report の全フロー
- エラーケースの処理

### Manual Testing

- Electron で各ページ動作確認
- IPC 通信の実際の動作確認
- Tailwind CSS スタイルの確認

---

## 6. ファイル作成リスト

### 新規作成（Phase 2-2）

```
src/renderer/components/
├── ConfigForm.tsx          // 設定フォーム
├── MergeProgress.tsx       // マージ進捗表示
├── DiffViewer.tsx          // Diff ビューア
├── ConflictResolver.tsx    // 競合解決 UI
└── ReportView.tsx          // レポート表示

src/renderer/pages/
├── ConfigPage.tsx          // 完全実装（現在プレースホルダー）
├── MergePage.tsx           // 完全実装（現在プレースホルダー）
├── ConflictPage.tsx        // 完全実装（現在プレースホルダー）
└── ReportPage.tsx          // 完全実装（現在プレースホルダー）

src/__tests__/unit/renderer/
├── ConfigPage.test.tsx
├── MergePage.test.tsx
├── ConflictPage.test.tsx
└── ReportPage.test.tsx

src/__tests__/integration/
└── ui-flow.test.ts         // UI フロー統合テスト
```

---

## 7. 実装チェックリスト

### ConfigPage
- [ ] ConfigForm コンポーネント作成
- [ ] ファイル選択ダイアログ実装
- [ ] IPC 通信実装
- [ ] エラーハンドリング
- [ ] 単体テスト
- [ ] スタイリング

### MergePage
- [ ] MergeProgress コンポーネント作成
- [ ] git:fetch 実装
- [ ] git:merge 実装
- [ ] 進捗イベントリスナー
- [ ] 単体テスト
- [ ] スタイリング

### ConflictPage
- [ ] DiffViewer コンポーネント作成
- [ ] ConflictResolver コンポーネント作成
- [ ] conflict:list 実装
- [ ] conflict:getDiff 実装
- [ ] conflict:resolve 実装
- [ ] 単体テスト
- [ ] スタイリング

### ReportPage
- [ ] ReportView コンポーネント作成
- [ ] report:getSummary 実装
- [ ] report:getDetails 実装
- [ ] ダウンロード機能
- [ ] 単体テスト
- [ ] スタイリング

---

## 8. 推定工数

| ページ | 工数 | 優先度 |
|--------|------|--------|
| ConfigPage | 4h | 🔴 高 |
| MergePage | 6h | 🟠 中 |
| ConflictPage | 8h | 🟠 中 |
| ReportPage | 4h | 🟡 低 |
| **合計** | **22h** | - |

---

## 9. 次のセッション開始時の手順

1. ConfigPage 実装開始
2. ConfigForm コンポーネントから始める
3. IPC 通信テストしながら進める
4. 各ページ完成後に統合テスト

---

## 10. 参考資料

- Electron IPC: https://www.electronjs.org/docs/latest/tutorial/ipc
- React Router: https://reactrouter.com/en/main
- Tailwind CSS: https://tailwindcss.com/docs
- 既存 IPC ハンドラー: `src/electron/ipc/*.ts`
- Preload スクリプト: `src/electron/preload.ts`
