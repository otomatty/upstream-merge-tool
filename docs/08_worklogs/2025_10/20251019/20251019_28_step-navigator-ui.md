# UI 改善: StepNavigator コンポーネント実装

**日付**: 2025-10-21  
**ステータス**: ✅ 完了  
**関連タスク**: Phase 2-2B GUI改善

## 概要

StatusBar を廃止し、高機能な StepNavigator コンポーネントに置き換えました。
前後のボタン、中央にステップインジケーター、入力検証により、ユーザーが直感的にステップを移動できるようになりました。

## 変更内容

### 1. StepNavigator コンポーネント新規作成

**ファイル**: `src/renderer/components/StepNavigator.tsx`

#### 主な機能

##### 1. **ステップインジケーター**
- 4 つのステップ（設定 → マージ → コンフリクト → レポート）を視覚的に表示
- 現在のステップを強調表示（青色）
- 完了したステップは緑のチェックマーク表示
- アクセス不可なステップはグレーアウト

##### 2. **前後のボタン**
- **戻る（左）**: 前のステップに移動
- **次へ（右）**: 次のステップに移動
- ボタンは状況に応じて自動的に有効/無効に切り替わる

##### 3. **入力検証**
- 各ステップの必須項目をチェック
- 未入力の場合は「次へ」ボタンが無効化
- 黄色の警告メッセージで「入力が不完全」と表示

##### 4. **ステップのアクセス制御**
- Config：常にアクセス可能
- Merge：Config が完了したらアクセス可能
- Conflict：Merge が完了かつコンフリクトがある場合にアクセス可能
- Report：Merge が完了したらアクセス可能

#### 検証ロジック

```typescript
const isCurrentStepValid = (): boolean => {
  switch (currentStep) {
    case 'config':
      // リポジトリ名、ブランチ名、マージ先ブランチがすべて入力されているか
      return config?.upstream_repository_name !== '' &&
             config?.upstream_branch_name !== '' &&
             config?.merge_target_branch !== '';
    case 'merge':
      return config !== null;
    case 'conflict':
      return mergeResult !== null && mergeResult.conflictFiles.length > 0;
    case 'report':
      return mergeResult !== null;
  }
};
```

### 2. App.tsx の更新

**ファイル**: `src/renderer/App.tsx`

- `StatusBar` インポートを削除
- `StepNavigator` インポートを追加
- `<StatusBar currentStep={currentStep} />` を `<StepNavigator ... />` に置き換え
- StepNavigator に必要なプロップ（config, mergeResult, onStepChange）を渡す

```tsx
<StepNavigator 
  currentStep={currentStep}
  config={config}
  mergeResult={mergeResult}
  onStepChange={setCurrentStep}
/>
```

## UI 構成

### レイアウト

```
┌─────────────────────────────────────────────────────────────────────┐
│  [戻る]          ① 設定 → ② マージ → ③ コンフリクト → ④ レポート   [次へ]  │
│                 (現在: ②マージ, 3/4)                               │
│                 ✓ 準備完了                                         │
├─────────────────────────────────────────────────────────────────────┤
│ 現在のステップ: マージ   3 / 4                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### ステップバッジの状態

- **現在のステップ**: 青色 + リング効果
- **完了したステップ**: 緑色 + チェックマーク
- **アクセス可能**: グレー（ホバー時は濃いグレー）
- **アクセス不可**: ライトグレー（無効表示）

### 準備状態インジケーター

- **準備完了**: 緑色のチェック + 「準備完了」テキスト（次へボタンが有効）
- **入力が不完全**: 黄色の警告 + 「入力が不完全です」テキスト（次へボタンが無効）

## UX フロー

### シナリオ 1: 正常な進行

```
1. Config ページを開く
2. 必須フィールド（リポジトリ名、ブランチ名、マージ先ブランチ）を入力
3. StepNavigator の「次へ」ボタンが有効化
4. 「次へ」クリック → Merge ページへ移動
5. マージ実行 → Merge 完了
6. 自動的に Conflict または Report ページへ進む
```

### シナリオ 2: 不完全な入力

```
1. Config ページで一部フィールドのみ入力
2. StepNavigator に「入力が不完全です」警告が表示
3. 「次へ」ボタンは無効（グレーアウト）
4. 残りのフィールドを入力
5. 警告が消え、「次へ」ボタンが有効化
```

### シナリオ 3: 前へ戻る

```
1. Merge ページで「戻る」をクリック
2. Config ページへ戻る
3. 前のページでも StepNavigator は表示され、前後の移動が可能
```

## 技術的メリット

- **ユーザーフレンドリー**: ワンステップで全体の進捗が把握できる
- **入力検証**: 不完全な入力を防ぎ、エラーを事前に防止
- **アクセス制御**: 前提条件を満たさないステップへのアクセスを自動的に制限
- **フレキシブルな移動**: ユーザーが以前のステップに戻ることが可能
- **レスポンシブ**: モバイル対応（sm: で説明文を隠す、md: で区切り線を表示）

## 削除されたコンポーネント

- **StatusBar** (`src/renderer/components/StatusBar.tsx`)
  - 簡単な text-only 表示だった
  - StepNavigator に統合

## 次のステップ

### Phase 2-2C へ向けて

1. **DiffViewer コンポーネント**: コンフリクト表示時に差分を可視化
2. **ConflictResolver コンポーネント**: コンフリクト解決 UI の実装
3. **Resolve IPC ハンドラー**: マージコンフリクト解決のバックエンド

### UI 改善の追加候補

- ステップバッジにツールチップを追加（ホバー時に詳細説明を表示）
- キーボード操作対応（← → キーでステップ移動）
- ステップのスキップ機能（例：Conflict が不要な場合は自動的に Report へ）
- 各ステップの推定時間を表示

## 関連ドキュメント

- `docs/04_implementation/plans/electron-gui/20251019_04_git-merge-steps-detailed.md` - Git マージプロセスの詳細
- `docs/04_implementation/plans/electron-gui/20251021_merge-destination-config.md` - マージ先ブランチ設定
- `docs/02_requirements/features/upstream-merge-tool-requirements.md` - 要件定義
