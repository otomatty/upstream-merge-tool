# Config→Mergeページ遷移後、戻せない問題

**発見日**: 2025-10-20  
**発見者**: AI Assistant  
**重要度**: High  

## 問題の概要

ConfigページからMergeページに進むと、戻れなくなる（または戻ると動作がおかしくなる）バグが発生している。

## 詳細な分析

### 原因1：ConfigFormの過度な再レンダリング

**ファイル**: `src/renderer/components/ConfigForm/ConfigForm.tsx`

ConfigForm コンポーネントには以下のコードがあります：

```typescript
// Notify parent when config is loaded
useEffect(() => {
  if (isValid) {
    onConfigLoaded?.(config);
  }
}, [config, isValid, onConfigLoaded]);
```

**問題**:
- `config`が依存配列に含まれているため、`config`が変更されるたびに`onConfigLoaded`が呼び出される
- `onConfigLoaded`は`App.tsx`の`handleConfigLoaded`（`setCurrentStep("merge")`を実行）を指す
- ユーザーが設定を編集すると、`config`が変更され、そのたびに`onConfigLoaded`が呼び出される
- これにより、ページを移動した後も、ConfigPageが存在し続ける限り、意図せず再度遷移が発生する可能性がある

### 原因2：複数の遷移トリガー

**ファイル**: `src/renderer/App.tsx`

ConfigFormで設定が読み込まれると、以下の処理が実行される流れが形成されている：

1. ConfigPage内のConfigFormで`config`が更新される
2. ConfigForm内の useEffect が実行され、`onConfigLoaded`が呼ばれる
3. App.tsx の `handleConfigLoaded` が実行され、`setCurrentStep("merge")`で状態変更
4. 一方、設定を再編集したり、UIが再レンダリングされたりすると...
5. ConfigForm が再度`onConfigLoaded`を呼び出す可能性がある

### 原因3：ページ戻り時のリセット不足

**ファイル**: `src/renderer/components/StepNavigator.tsx`

`handlePreviousStep`で ConfigPage に戻る際、特に検証が行われていない。ConfigForm の状態がリセットされず、不正な状態が残っている可能性がある。

## 影響範囲

- ユーザーがConfigページからMergeページに遷移した後、戻るボタンが適切に機能しない
- Mergeページで設定を編集したいと思ってもできない
- UXが大きく損なわれる

## 提案する解決策

### 対策1：onConfigLoaded の過度な呼び出しを防ぐ（推奨）

```typescript
// ConfigForm.tsx の useEffect を改善

// ❌ 現在のコード
useEffect(() => {
  if (isValid) {
    onConfigLoaded?.(config);
  }
}, [config, isValid, onConfigLoaded]);

// ✅ 改善案1：初回ロード時のみ呼び出す
const configLoadedRef = useRef(false);
useEffect(() => {
  if (isValid && !configLoadedRef.current) {
    configLoadedRef.current = true;
    onConfigLoaded?.(config);
  }
}, [isValid, onConfigLoaded, config]);

// ✅ 改善案2：明示的なボタンから呼び出す
// "次へ進む"ボタンを ConfigForm に追加し、
// ボタン押下時のみ onConfigLoaded を呼び出す
const handleProceedToMerge = useCallback(() => {
  const isFormValid = await validate();
  if (isFormValid) {
    onConfigLoaded?.(config);
  }
}, [config, validate, onConfigLoaded]);
```

### 対策2：ページ戻り時のクリーンアップ

```typescript
// App.tsx で、currentStep が "config" に戻される際
// ConfigForm のリセット処理を考慮

const handleStepChange = (step: "config" | "merge" | "conflict" | "report") => {
  if (step === "config") {
    // ConfigForm をリセット（必要に応じて）
    // 例：設定を初期化する、エラーをクリアする
  }
  setCurrentStep(step);
};
```

### 対策3：ページ遷移の明示的な制御

```typescript
// StepNavigator.tsx の handlePreviousStep を改善
const handlePreviousStep = () => {
  const currentIndex = getStepIndex(currentStep);
  if (currentIndex > 0) {
    const previousStep = STEPS[currentIndex - 1]?.id;
    if (previousStep && isStepAccessible(previousStep)) {
      // ページ離脱時のクリーンアップ処理
      if (currentStep === "merge") {
        // Merge ページのクリーンアップ（マージ処理をキャンセルする等）
        // TODO: Merge ページでキャンセル機能を実装
      }
      onStepChange(previousStep);
    }
  }
};
```

## テスト方法

1. Config ページで設定を入力
2. 「次へ」ボタンをクリックして Merge ページへ移動
3. 「戻る」ボタンをクリックして Config ページに戻る
4. 再度「次へ」ボタンをクリックして Merge ページへ移動
5. 複数回の往来が問題なく動作することを確認

## 関連ドキュメント

- [ConfigForm実装](../../04_implementation/plans/config-gui-improvement/)
- [UIコンポーネント設計](../../03_design/architecture/upstream-merge-tool-architecture.md)
- [E2Eテスト強化計画](../../04_implementation/plans/e2e-tests-enhancement/)

## 次のステップ

1. 根本原因を特定するため、ブラウザのDevToolsでログを確認
2. ConfigForm の useEffect の依存配列を修正
3. ページ遷移時のクリーンアップ処理を実装
4. E2Eテストを追加して、ページ往来が正常に機能することを確認
