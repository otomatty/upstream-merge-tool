# Config→Mergeページ遷移後、戻せない問題

**発見日**: 2025-10-20  
**発見者**: AI Assistant  
**重要度**: High  
**ステータス**: ✅ 解決済み  
**解決日**: 2025-10-21  

## 問題の概要

ConfigページからMergeページに進むと、戻れなくなる（または戻ると動作がおかしくなる）バグが発生していた。

## 詳細な分析

### 根本原因：ConfigFormの過度な再レンダリング

**ファイル**: `src/renderer/components/ConfigForm/ConfigForm.tsx`

ConfigForm コンポーネントには以下のコードがありました：

```typescript
// ❌ 問題のあったコード
useEffect(() => {
  if (isValid) {
    onConfigLoaded?.(config);  // config が変更されるたびに呼ばれる
  }
}, [config, isValid, onConfigLoaded]);
```

**問題の連鎖**：
1. ConfigPageで設定が変更される → `config`状態が更新
2. `useEffect`が発火 → `onConfigLoaded`が呼び出される
3. `App.tsx`の`handleConfigLoaded`実行 → `setCurrentStep("merge")`で遷移
4. MergeページからConfigページに戻る
5. 再度設定が編集されたりUIが再レンダリングされたりすると...
6. ConfigFormの`config`が再び変更 → 意図せず再度遷移が発生
7. **不安定な状態に陥る**

## 影響範囲

- ユーザーがConfigページからMergeページに遷移した後、戻るボタンが適切に機能しない
- Mergeページで設定を編集したいと思ってもできない
- UXが大きく損なわれる

## 実装した解決策（対策2）

### 🔧 修正内容

**ファイル**: `src/renderer/components/ConfigForm/ConfigForm.tsx`

#### 1. インポートに ChevronRight アイコンを追加

```typescript
import { Save, Upload, Loader, AlertCircle, CheckCircle, ChevronRight } from 'lucide-react';
```

#### 2. 自動呼び出しの useEffect を削除

```typescript
// ✅ 修正後：自動呼び出しを廃止し、初期化処理のみ残す
useEffect(() => {
  if (initialConfig) {
    console.log('📋 Initial config loaded:', initialConfig);
  }
}, []);
```

#### 3. 新ハンドラーを追加

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

#### 4. UIボタンを追加

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

## テスト結果

✅ **全て成功**

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
   - `useEffect`での無限ループなし
   - 親コンポーネントの状態が安定

3. **ページ往来が安定**
   - Configページ ↔ Mergeページの往来が問題なし
   - 複数回の往来も安定

4. **ユーザビリティが向上**
   - 次のステップへの進行が明確
   - 戻ってやり直すことが容易

## 関連ドキュメント

- **作業ログ**: `docs/08_worklogs/2025_10/20251021/20251021_01_config-merge-navigation-fix.md`
- **GUI改善計画**: `docs/04_implementation/plans/config-gui-improvement/`
- **アーキテクチャ**: `docs/03_design/architecture/upstream-merge-tool-architecture.md`

## 将来の改善提案

1. **プリセットタブへの適用**
   - 対策2はクイック設定タブに適用済み
   - プリセット選択時も同様の明示的ボタン操作への統一を検討

2. **E2Eテストの追加**
   - ページ往来シナリオのテストを追加
   - 他のページ遷移パターンも検証

3. **ログの活用**
   - 追加したログメッセージ（`📋 Initial config loaded` 等）でデバッグ性向上

## 学んだこと

### React useEffect の注意点

1. **依存配列に頻繁に変更される値を含めない**
   - `config`のような毎回更新される値は避けるべき
   - 必要な場合は`useRef`で初回チェックを行う

2. **複数のuseEffectでの状態同期は危険**
   - コンポーネント内でイベント（ボタン押下）と状態変更（useEffect）が混在すると複雑に
   - 明示的なイベントハンドラーに統一するべき

3. **親子コンポーネント間の状態フロー**
   - 親の状態変更が子のレンダリングを誘発
   - これが子のuseEffectを再発火させ、無限ループの温床に
   - コールバック関数の設計時点で意図を明確にすることが重要

### ベストプラクティス

- ページ遷移のようなユーザーが認識すべき大きなアクションは、**必ず明示的なボタン/リンクから実行**
- 自動遷移は、検索結果から詳細ページへの移動など、**単方向で戻ってこないパターン**に限定
- 往来が考えられるページ遷移は、**ボタン式が安定**
