# ConfigページからMergeページへの遷移問題を修正

**日時**: 2025-10-21  
**作業者**: AI Assistant  
**ステータス**: ✅ 完了  

## 概要

ConfigページからMergeページに進むと戻れなくなるバグを、対策2（明示的なボタンによる呼び出し）で解決しました。

## 発見された問題

### 根本原因
`src/renderer/components/ConfigForm/ConfigForm.tsx` の `useEffect` が過度に実行されていました。

```typescript
// ❌ 問題のあるコード
useEffect(() => {
  if (isValid) {
    onConfigLoaded?.(config);  // ← config が変更されるたびに呼ばれる！
  }
}, [config, isValid, onConfigLoaded]);
```

**問題の連鎖**：
1. ConfigForm内で設定が変更される → `config` 状態が更新
2. `useEffect` 発火 → `onConfigLoaded` が呼び出される
3. `App.tsx` の `handleConfigLoaded` 実行 → `setCurrentStep("merge")`で遷移
4. MergeページからConfigページに戻る
5. 再度UIが再レンダリングされたり設定が編集されたりすると...
6. ConfigForm の `config` が再び変更 → 意図せず再度遷移が発生
7. **不安定な状態に陥る**

## 実装した解決策（対策2）

### 1. 自動呼び出しの useEffect を削除

```typescript
// ✅ 修正後：自動呼び出しを廃止
useEffect(() => {
  if (initialConfig) {
    console.log('📋 Initial config loaded:', initialConfig);
  }
}, []);
```

### 2. 「マージに進む」ボタンを追加

明示的なボタンをUIに追加し、ユーザーの意思を明確にしました。

```typescript
<Button
  onClick={handleProceedToMerge}
  disabled={isLoading || !isValid}
  variant="default"
  className="ml-auto"
>
  <span>マージに進む</span>
  <ChevronRight className="ml-2 h-4 w-4" />
</Button>
```

### 3. ボタン押下時のみ onConfigLoaded を呼び出す

```typescript
// Handle proceeding to merge page - explicit user action
const handleProceedToMerge = useCallback(async () => {
  const isFormValid = await validate();
  if (isFormValid) {
    console.log('✅ Config validated, proceeding to merge page');
    onConfigLoaded?.(config);  // ← ユーザーボタン押下時のみ実行
  } else {
    console.log('❌ Config validation failed, cannot proceed');
  }
}, [config, validate, onConfigLoaded]);
```

## 修正内容

### 変更ファイル
- `src/renderer/components/ConfigForm/ConfigForm.tsx`

### 変更点の詳細

1. **インポートに ChevronRight アイコンを追加**
   - ボタンUIを改善するため

2. **過度な useEffect を削除**
   - `config` 変更時の自動呼び出しを廃止
   - 初期化処理のみを残す

3. **新ハンドラーを追加: handleProceedToMerge**
   - ボタン押下時に検証を実行
   - 検証成功時のみ `onConfigLoaded` を呼び出す

4. **UIボタンを追加**
   - 「マージに進む」ボタンを ConfigForm に統合
   - 右寄せで目立つ配置に

## テスト結果

✅ **成功**

以下の流れで正常に動作確認済み：

1. **ConfigページでJSONを読み込み** ✓
2. **「マージに進む」ボタンをクリック** ✓
   - バリデーション実行
   - Mergeページへ遷移
3. **「戻る」ボタンをクリック** ✓
   - 正常にConfigページに戻る
   - UIの状態が正常に保持される
4. **再度「マージに進む」をクリック** ✓
   - 何度繰り返しても正常に動作

## メリット

1. **ユーザーの意図が明確**
   - ボタン押下という明示的なアクションで遷移
   - 自動遷移による予期しない動作がない

2. **状態管理がシンプル**
   - `useEffect` での無限ループなし
   - 親コンポーネントの状態が安定

3. **ページ往来が安定**
   - Configページ ↔ Mergeページの往来が問題なし
   - 複数回の往来も安定

4. **ユーザビリティが向上**
   - 次のステップへの進行が明確
   - 戻ってやり直すことが容易

## 次のステップ

### 今後の改善提案

1. **プリセットタブでも同様の処理を適用**
   - 対策2はクイック設定タブに適用済み
   - プリセット選択時も明示的なボタン操作への統一を検討

2. **E2Eテストの追加**
   - ページ往来シナリオのテストを追加
   - 他のページ遷移パターンも検証

3. **ログの活用**
   - 追加したログメッセージ（`📋 Initial config loaded` 等）でデバッグ性向上
   - 本番環境では必要に応じて削除

## 関連ドキュメント

- **問題追跡**: `docs/issues/open/20251020_02_config-to-merge-navigation-broken.md`
- **GUI改善計画**: `docs/04_implementation/plans/config-gui-improvement/`
- **アーキテクチャ**: `docs/03_design/architecture/upstream-merge-tool-architecture.md`

## 学んだこと

### React の useEffect における注意点

1. **依存配列に頻繁に変更される値を含めない**
   - `config` のような毎回更新される値は避けるべき
   - 必要な場合は `useRef` で初回チェックを行う

2. **複数の useEffect での状態同期は危険**
   - コンポーネント内でイベント（ボタン押下）と状態変更（useEffect）が混在すると複雑に
   - 明示的なイベントハンドラーに統一するべき

3. **親子コンポーネント間の状態フロー**
   - 親の状態変更が子のレンダリングを誘発する
   - これが子の useEffect を再発火させ、無限ループの温床に
   - コールバック関数の設計時点で意図を明確にすることが重要

### ベストプラクティス

- ページ遷移のようなユーザーが認識すべき大きなアクションは、**必ず明示的なボタン/リンクから実行**
- 自動遷移は、検索結果から詳細ページへの移動など、**単方向で戻ってこないパターン**に限定
- 往来が考えられるページ遷移は、**ボタン式が安定**

## コミット対象

```
fix: prevent automatic navigation in ConfigForm by using explicit button action

- Remove automatic onConfigLoaded invocation from useEffect
- Add "マージに進む" (Proceed to Merge) button to ConfigForm
- Validation is now triggered by explicit user action
- Fixes issue where navigating back from Merge to Config page was broken

Fixes: #20251020_02
```
