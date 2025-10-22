# Merge Destination Branch Configuration 実装

**日付**: 2025-10-21  
**ステータス**: ✅ 完了  
**関連タスク**: Phase 2-2B (GUI実装), マージ先ブランチ設定

## 概要

マージ先ブランチ (merge_target_branch) を設定ファイルで管理できる機能を実装しました。
ユーザーが Config 画面で明示的にマージ先ブランチを指定でき、Merge ページでそれが自動的に確認・使用されるようになりました。

## 変更内容

### 1. 型定義の更新

**ファイル**: `src/shared/types/ipc.ts`

```typescript
// ConfigType に merge_target_branch を追加
export type ConfigType = {
  upstream_repository_name: string;
  upstream_branch_name: string;
  merge_target_branch: string;  // ← 新規追加
  // ... その他フィールド
};

// ProgressEvent に 'checkout' タイプを追加
export type ProgressEvent = {
  type: 'fetch' | 'checkout' | 'merge' | 'add' | 'commit';  // ← 'checkout' を追加
  // ... その他フィールド
};
```

### 2. ConfigForm コンポーネントの強化

**ファイル**: `src/renderer/components/ConfigForm.tsx`

- **設定フィールドセクション追加**: JSON エディタの上に UI フィールドを追加
  - リポジトリ名入力
  - アップストリームブランチ入力
  - **マージ先ブランチ入力（新規）**

- **設定サマリーの更新**: マージ先ブランチの表示を追加

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>
    <label>リポジトリ名</label>
    <input value={config.upstream_repository_name} onChange={...} />
  </div>
  <div>
    <label>アップストリームブランチ</label>
    <input value={config.upstream_branch_name} onChange={...} />
  </div>
  <div>
    <label>マージ先ブランチ</label>
    <input 
      value={config.merge_target_branch} 
      onChange={(e) => setConfig({...config, merge_target_branch: e.target.value})}
    />
  </div>
</div>
```

### 3. MergeOptions コンポーネントの更新

**ファイル**: `src/renderer/components/MergeOptions.tsx`

設定された `merge_target_branch` を表示専用フィールドで表示:

```tsx
<div>
  <label>Merge Destination Branch</label>
  <input
    type="text"
    value={config.merge_target_branch}
    disabled
    className="... bg-blue-50 text-blue-700 ..."
  />
</div>
```

### 4. GitService に checkout メソッドを追加

**ファイル**: `src/git/GitService.ts`

```typescript
/**
 * Checkout a branch
 */
async checkout(branchName: string): Promise<void> {
  try {
    this.logger.info(`Checking out branch: ${branchName}`);
    const result = await this.exec(`git checkout ${branchName}`);

    if (result.exitCode !== 0) {
      throw new Error(`Git checkout failed: ${result.stderr}`);
    }

    this.logger.info(`Successfully checked out branch: ${branchName}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Checkout operation failed: ${errorMessage}`);
    throw error;
  }
}
```

### 5. IPC ハンドラーの拡張

**ファイル**: `src/electron/ipc/gitHandlers.ts`

Git checkout 操作の IPC ハンドラーを追加:

```typescript
ipcMain.handle('git:checkout', async (_event, branchName: string): Promise<void> => {
  try {
    logger.info(`Checking out branch: ${branchName}`);
    mainWindow?.webContents.send('git:progress', {
      type: 'checkout',
      status: 'started',
      message: `Checking out branch: ${branchName}...`,
    });

    await gitService.checkout(branchName);

    mainWindow?.webContents.send('git:progress', {
      type: 'checkout',
      status: 'completed',
      message: `Successfully checked out branch: ${branchName}`,
    });

    logger.info(`Checkout completed for branch: ${branchName}`);
  } catch (error) {
    // ... エラーハンドリング
  }
});
```

### 6. Preload スクリプトの更新

**ファイル**: `src/electron/preload.ts`

ElectronAPI に checkout メソッドを公開:

```typescript
type ElectronAPI = {
  git: {
    fetch: (remote: string) => Promise<void>;
    checkout: (branchName: string) => Promise<void>;  // ← 新規追加
    merge: (remote: string, branch: string) => Promise<MergeResult>;
    // ... その他メソッド
  };
  // ...
};

const electronAPI: ElectronAPI = {
  git: {
    fetch: (remote) => ipcRenderer.invoke('git:fetch', remote),
    checkout: (branchName) => ipcRenderer.invoke('git:checkout', branchName),  // ← 実装
    merge: (remote, branch) => ipcRenderer.invoke('git:merge', remote, branch),
    // ...
  },
  // ...
};
```

### 7. MergePage の 3 ステップマージフロー実装

**ファイル**: `src/renderer/pages/MergePage.tsx`

マージプロセスを 3 ステップに改善:

**従来**:
1. Fetch
2. Merge

**新規**:
1. Fetch: リモート更新を取得
2. **Checkout**: マージ先ブランチ (`merge_target_branch`) に切り替え
3. Merge: フェッチしたブランチをマージ

```typescript
const handleMergeStart = useCallback(async (remote: string, branch: string) => {
  // Step 1: Fetch
  setProgress(prev => [...prev, {
    type: 'fetch',
    status: 'started',
    message: `Fetching from ${remote}...`
  }]);
  await ipc.git?.fetch?.(remote);

  // Step 2: Checkout merge destination branch
  setProgress(prev => [...prev, {
    type: 'checkout',
    status: 'started',
    message: `Checking out branch: ${config.merge_target_branch}...`
  }]);
  await ipc.git?.checkout?.(config.merge_target_branch);

  // Step 3: Merge
  setProgress(prev => [...prev, {
    type: 'merge',
    status: 'started',
    message: `Merging ${remote}/${branch} into ${config.merge_target_branch}...`
  }]);
  const mergeRes = await ipc.git?.merge?.(remote, branch);
  
  // ... 結果処理
}, [config, ipc, navigate, onMergeComplete]);
```

## ユーザーフロー

### 設定画面での手順

1. **ConfigPage** を開く
2. **設定ファイルを選択**
3. **マージ先ブランチ入力**: デフォルト値 "main" をカスタマイズ可能
4. **保存** → JSON ファイルに `merge_target_branch` が含まれて保存
5. **次へ** → MergePage に進む

### マージ画面での手順

1. **MergePage** を開く
2. **リモート選択**: "upstream" / "origin"
3. **ブランチ入力**: マージしたいブランチ名
4. **マージ先確認**: "Merge Destination Branch" に設定値が表示（読み取り専用）
5. **Start Merge** をクリック
   - ステップ 1: Fetch
   - ステップ 2: Checkout (merge_target_branch)
   - ステップ 3: Merge

## 技術的メリット

- **明示的な設定**: マージ先ブランチをコンフィグで管理でき、意図しないブランチへのマージを防止
- **ユーザーフレンドリー**: Config 画面で一度設定すれば、以後の操作が簡潔
- **プロセスの可視化**: 3 ステップの進行状況がリアルタイム表示
- **エラー防止**: チェックアウト失敗時の明確なエラーメッセージ

## テスト検証項目

- [ ] ConfigForm で merge_target_branch 入力が機能
- [ ] 設定ファイルに merge_target_branch が保存される
- [ ] MergePage で merge_target_branch が正しく表示される
- [ ] 3 ステップマージが正常に実行される
- [ ] 存在しないブランチへのチェックアウトでエラーが出ることを確認
- [ ] コンフリクト時のエラーハンドリングが機能

## 次のステップ

### Phase 2-2C へ向けて

1. **DiffViewer コンポーネント**: コンフリクト表示時に差分を可視化
2. **ConflictResolver コンポーネント**: コンフリクト解決 UI の実装
3. **Resolve IPC ハンドラー**: マージコンフリクト解決のバックエンド

### 追加検討事項

- Branch 入力フィールドの入力補完 (ローカルブランチ一覧表示)
- マージ時の dry-run オプション
- ロールバック機能 (マージ後に reset --hard する)
- マージ履歴のレポート表示

## 関連ドキュメント

- `docs/04_implementation/plans/electron-gui/20251019_04_git-merge-steps-detailed.md` - Git マージプロセスの詳細
- `docs/04_implementation/plans/electron-gui/20251019_05_merge-destination-branch-design.md` - マージ先ブランチ設計
- `docs/02_requirements/features/upstream-merge-tool-requirements.md` - 要件定義
