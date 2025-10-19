# 2025-10-19: ナビゲーション問題の修正完了

## 概要

前のボタンで戻れない問題を解決しました。無限ループと不適切なナビゲーション構造が原因でした。

## 問題の分析

### 症状
- "戻る"ボタンを押すと一瞬前のページが表示されるが、すぐに元のページに戻される
- ConsoleにはConfig loading logs が何度も表示される

### 根本原因

1. **無限ループの問題**
   - ConfigForm の useEffect が parent の callback dependency によって何度も実行される
   - 親が再レンダリングされるたびに新しい handleValidate が作成され、useEffect が再度実行される
   - このため、ConfigForm がアンマウント/再マウントされるたびに初期化ロジックが走る

2. **ナビゲーション構造の問題**
   - App.tsx で currentStep と useNavigate() の同期が不完全
   - StepNavigator が onStepChange() を呼ぶ → setCurrentStep → useEffect で navigate → ページ遷移
   - しかし、コンポーネント再マウント時に何か副作用で currentStep が変わる可能性があった

3. **責任分離の欠落**
   - デフォルト設定の読み込みが ConfigForm 内で行われ、コンポーネント再マウント時に何度も実行される
   - これが state 変更を引き起こし、不安定なナビゲーション動作につながる

## 実施した修正

### 1. App.tsx の改善
- AppContent コンポーネントを作成（HashRouter 内でのみ useNavigate() を使用可能）
- アプリケーション初期化ロジックをアプリケーション層に移動
- マウント時にデフォルト設定を App.tsx で読み込む
- currentStep 変更時にのみ navigate() を実行

```typescript
// 改善前: currentStep と navigate() の同期が曖昧
// 改善後: AppContent 内で明確に useEffect で navigate() を実行
useEffect(() => {
  console.log('🔄 Navigating to:', currentStep);
  navigate(`/${currentStep}`);
}, [currentStep]);
```

### 2. StepNavigator の簡潔化
- useNavigate() を削除（App.tsx の useEffect が担当）
- onStepChange() callback のみを呼び出す
- コンポーネント責任を明確に（ナビゲーション UI のみ）

### 3. ConfigForm の改善
- 親から initialConfig を受け取る仕組みを追加
- デフォルト設定読み込み時に無限ループを防ぐ（useRef フラグ）
- initialConfig が提供されている場合は、デフォルト読み込みをスキップ

```typescript
if (initialConfig) {
  console.log('📝 Using initial config from parent');
  setConfig(initialConfig);
  setJsonContent(JSON.stringify(initialConfig, null, 2));
  setIsValid(true);
  return;  // デフォルト読み込みをスキップ
}
```

### 4. ConfigPage の改善
- initialConfig プロップを追加
- ConfigForm に initialConfig を渡す

### 5. App.tsx の ConfigPage に initialConfig を渡す
- App.tsx の config state を ConfigPage に渡す
- ConfigForm がマウントされるたびに initialConfig から初期化できる

## テスト計画

1. **基本的なナビゲーション**
   - ConfigPage で設定を読み込む
   - 「次へ」ボタンで MergePage に移動
   - 「戻る」ボタンで ConfigPage に戻る
   - config が保持されているか確認

2. **複数回のナビゲーション**
   - 複数回前後に移動
   - ConsoleログでConfigロードが1回だけ表示されることを確認
   - ページ遷移がスムーズか確認

3. **ページ再マウント**
   - ConfigPage に戻った後、設定が保持されているか確認
   - 新たに設定を読み込めるか確認

## 修正ファイル

- `src/renderer/App.tsx` - AppContent 分離、初期化ロジック移動
- `src/renderer/components/StepNavigator.tsx` - useNavigate() 削除
- `src/renderer/components/ConfigForm.tsx` - initialConfig サポート、無限ループ防止
- `src/renderer/pages/ConfigPage.tsx` - initialConfig プロップ追加

## 次のステップ

1. アプリケーション起動確認
2. ナビゲーションフローをテスト
3. デバッグコンソールでログ確認
4. 必要に応じて微調整
