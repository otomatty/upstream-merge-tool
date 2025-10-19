# Git マージステップの詳細解説

**作成日**: 2025-10-19

---

## 概要

MergePage で実装されている Git マージプロセスは、**2段階のステップ**から構成されています。

```
┌─────────────────────────────────────────────┐
│         マージ実行フロー                    │
├─────────────────────────────────────────────┤
│  ステップ 1: fetch (リモートから取得)      │
│  ステップ 2: merge (ブランチをマージ)      │
└─────────────────────────────────────────────┘
```

---

## ステップ 1: fetch - リモートからの更新取得

### 1.1 何をしているのか

```bash
git fetch <remote>
```

**目的**: ローカルリポジトリに、リモートリポジトリの最新情報を持ってくる

### 1.2 実装フロー（UI）

```typescript
// MergePage.tsx - handleMergeStart()

// Step 1: Fetch from remote
setProgress(prev => [...prev, {
  type: 'fetch',
  status: 'started',
  message: `Fetching from ${remote}...`
}]);

const fetchResult = await ipc.git?.fetch?.(remote);

setProgress(prev => [...prev, {
  type: 'fetch',
  status: 'completed',
  message: `✓ Successfully fetched from ${remote}/${branch}`
}]);
```

**表示例**:
```
▶ Fetching from upstream...
✓ Successfully fetched from upstream/main
```

### 1.3 実装フロー（バックエンド）

```typescript
// gitHandlers.ts - 'git:fetch' ハンドラー

ipcMain.handle('git:fetch', async (_event, remote: string) => {
  try {
    logger.info(`Fetching from remote: ${remote}`);
    
    // UI に進捗を送信
    mainWindow?.webContents.send('git:progress', {
      type: 'fetch',
      status: 'started',
      message: `Fetching from ${remote}...`,
    });

    // 実際の fetch 実行
    await gitService.fetch(remote);

    // 完了を通知
    mainWindow?.webContents.send('git:progress', {
      type: 'fetch',
      status: 'completed',
      message: 'Fetch completed',
    });

    logger.info('Fetch completed successfully');
  } catch (error) {
    // エラーを通知
    logger.error(`Fetch failed: ${error}`);
    mainWindow?.webContents.send('git:progress', {
      type: 'fetch',
      status: 'error',
      message: `Fetch failed: ${error}`,
    });
    throw error;
  }
});
```

### 1.4 実装フロー（GitService）

```typescript
// GitService.ts - fetch() メソッド

async fetch(remoteName: string): Promise<void> {
  try {
    this.logger.info(`Fetching from remote: ${remoteName}`);
    
    // git fetch コマンド実行
    const result = await this.exec(`git fetch ${remoteName}`);

    if (result.exitCode !== 0) {
      throw new Error(`Git fetch failed: ${result.stderr}`);
    }

    this.logger.info('Git fetch completed successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Fetch operation failed: ${errorMessage}`);
    throw error;
  }
}
```

### 1.5 fetch の動作確認

実行後、ローカルリポジトリには以下の情報が追加されます:

```bash
# fetch 後、以下が確認可能
$ git branch -r
origin/main
upstream/main      ← fetch で追加された最新情報
upstream/develop

# リモートの最新コミットが確認できる
$ git log upstream/main -1
commit abc123def456...
Author: User
Date: 2025-10-19
    Latest changes from upstream
```

---

## ステップ 2: merge - ブランチをマージ

### 2.1 何をしているのか

```bash
git merge upstream/main --allow-unrelated-histories
```

**目的**: 取得した upstream の変更を、現在のローカルブランチに統合する

### 2.2 実装フロー（UI）

```typescript
// MergePage.tsx - handleMergeStart()

// Step 2: Merge
setProgress(prev => [...prev, {
  type: 'merge',
  status: 'started',
  message: `Merging ${remote}/${branch} into current branch...`
}]);

const mergeRes = await ipc.git?.merge?.(remote, branch);

if (mergeRes?.success) {
  setProgress(prev => [...prev, {
    type: 'merge',
    status: 'completed',
    message: `✓ Merge completed successfully`,
    conflictCount: mergeRes.conflictFiles?.length || 0
  }]);
} else {
  throw new Error(mergeRes?.error || 'Merge failed');
}
```

**表示例（成功時）**:
```
▶ Merging upstream/main into current branch...
✓ Merge completed successfully
Conflicts: 0
```

**表示例（競合あり）**:
```
▶ Merging upstream/main into current branch...
✓ Merge completed successfully
Conflicts: 3
```

### 2.3 実装フロー（バックエンド）

```typescript
// gitHandlers.ts - 'git:merge' ハンドラー

ipcMain.handle('git:merge', async (_event, remote: string, branch: string): Promise<MergeResult> => {
  try {
    logger.info(`Starting merge: ${remote}/${branch}`);
    
    // UI に進捗を送信
    mainWindow?.webContents.send('git:progress', {
      type: 'merge',
      status: 'started',
      message: `Starting merge from ${remote}/${branch}...`,
    });

    // 実際のマージ実行
    const result = await gitService.merge(remote, branch);

    // 完了を通知
    mainWindow?.webContents.send('git:progress', {
      type: 'merge',
      status: 'completed',
      message: `Merge completed. Conflicts: ${result.conflictFiles.length}`,
      conflictCount: result.conflictFiles.length,
    });

    logger.info(`Merge completed. Conflicts: ${result.conflictFiles.length}`);
    return result;
  } catch (error) {
    logger.error(`Merge failed: ${error}`);
    mainWindow?.webContents.send('git:progress', {
      type: 'merge',
      status: 'error',
      message: `Merge failed: ${error}`,
    });
    throw error;
  }
});
```

### 2.4 実装フロー（GitService）

```typescript
// GitService.ts - merge() メソッド

async merge(remoteName: string, branchName: string): Promise<MergeResult> {
  try {
    const fullBranchName = `${remoteName}/${branchName}`;
    this.logger.info(`Starting merge with: ${fullBranchName}`);

    // git merge コマンド実行
    // --allow-unrelated-histories: 別々の歴史を持つブランチをマージ可能にする
    const result = await this.exec(
      `git merge ${fullBranchName} --allow-unrelated-histories`
    );

    // exit code で結果を判定
    if (result.exitCode === 0) {
      // 成功: 競合なし
      this.logger.info('Merge completed successfully without conflicts');
      return {
        success: true,
        conflictFiles: [],
      };
    } else if (result.exitCode === 1) {
      // 失敗: 競合あり
      const conflictFiles = await this.getConflictFiles();
      this.logger.info(`Merge completed with ${conflictFiles.length} conflict files`, {
        conflictFiles,
      });

      return {
        success: false,
        conflictFiles,  // 競合ファイル一覧を返す
      };
    } else {
      // 予期しないエラー
      throw new Error(`Git merge failed with exit code ${result.exitCode}: ${result.stderr}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Merge operation failed: ${errorMessage}`);

    return {
      success: false,
      conflictFiles: [],
      error: errorMessage,
    };
  }
}
```

### 2.5 `--allow-unrelated-histories` フラグについて

このフラグは重要です。通常、Git は関連のない歴史を持つブランチをマージしようとするとエラーになります。

```bash
# フラグなしの場合のエラー
$ git merge upstream/main
fatal: refusing to merge unrelated histories

# フラグありで許可
$ git merge upstream/main --allow-unrelated-histories
Merge made by the 'recursive' strategy.
```

**このツールが使用する理由**:
- upstream リポジトリとローカルリポジトリの歴史が別々である
- フォークされたリポジトリで起こりやすい
- 別々の出発点から始まったプロジェクトのマージに対応

### 2.6 merge 完了後の状態

**競合なし（`success: true`）**:
```bash
$ git log --oneline -3
abc1234 Merge upstream/main
def5678 Latest upstream changes
ghi9012 Previous commit
```

**競合あり（`success: false`）**:
```bash
$ git status
On branch main
You have unmerged paths.
  (fix conflicts and run "git commit")
  (use "git merge --abort" to abort the merge)

Unmerged paths:
  (use "git add <file>..." to mark resolution)
    both modified:   src/components/Form.tsx
    both modified:   src/utils/helper.ts
```

---

## 競合ファイルの検出

### 3.1 実装

```typescript
// GitService.ts - getConflictFiles() メソッド

async getConflictFiles(): Promise<string[]> {
  try {
    this.logger.debug('Retrieving conflicted files');

    // git diff で競合ファイルを検出
    // --diff-filter=U: Unmerged ファイルのみ取得
    const result = await this.exec('git diff --name-only --diff-filter=U');

    if (result.exitCode !== 0) {
      this.logger.warn(`Failed to get conflict files: ${result.stderr}`);
      return [];
    }

    // ファイルパスをパース
    const files = result.stdout
      .trim()
      .split('\n')
      .filter((line) => line.length > 0);

    this.logger.debug(`Found ${files.length} conflicted files`, { files });
    return files;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Failed to retrieve conflict files: ${errorMessage}`);
    return [];
  }
}
```

### 3.2 コマンドの実行例

```bash
# 競合ファイルを検出
$ git diff --name-only --diff-filter=U
src/components/Form.tsx
src/utils/helper.ts
docs/README.md

# 返される MergeResult
{
  "success": false,
  "conflictFiles": [
    "src/components/Form.tsx",
    "src/utils/helper.ts",
    "docs/README.md"
  ]
}
```

---

## 全体のフロー図

```
┌─────────────────────────────────────────────────────────────┐
│ MergePage: ユーザーが「Start Merge」をクリック             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ handleMergeStart() - フロントエンド                        │
│ - 状態初期化                                                │
│ - IPC: ipc.git.fetch(remote)                               │
│ - IPC: ipc.git.merge(remote, branch)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ IPC Bridge (gitHandlers.ts)                                │
│ - 'git:fetch' ハンドラー                                    │
│   └─ GitService.fetch() 呼び出し                           │
│ - 'git:merge' ハンドラー                                    │
│   └─ GitService.merge() 呼び出し                           │
│ - git:progress イベントで UI に通知                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ GitService (バックエンド)                                   │
│ - fetch(): $ git fetch upstream                            │
│ - merge(): $ git merge upstream/main --allow-unrelated... │
│ - getConflictFiles(): $ git diff --name-only --diff-filter│
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Git コマンド実行                                           │
│ - リモートから情報取得                                      │
│ - ローカルブランチとマージ                                  │
│ - 競合ファイルを検出                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
   競合なし              競合あり
   success: true         success: false
   conflictFiles: []     conflictFiles: [...]
        │                         │
        └────────────┬────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ MergeResult を返却                                         │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
  ReportPage へ        ConflictPage へ
  (競合なし)           (競合解決が必要)
```

---

## エラーハンドリング

### 4.1 fetch でのエラー

```typescript
// 考えられるエラー
- ネットワーク接続がない
- リモートが存在しない
- 認証情報が不足している
- リモートにアクセス権がない

// 例: リモートが存在しない
$ git fetch nonexistent
fatal: 'nonexistent' does not appear to be a 'git' repository
```

### 4.2 merge でのエラー

```typescript
// 考えられるエラー
- 未コミットの変更がある
- マージ中に予期しないエラー
- ブランチが存在しない

// 例: 未コミットの変更
$ git merge upstream/main
error: Your local changes to 'src/file.ts' would be overwritten by merge.
Aborting
```

### 4.3 エラーハンドリングの実装

```typescript
// MergePage.tsx

try {
  const fetchResult = await ipc.git?.fetch?.(remote);
  const mergeRes = await ipc.git?.merge?.(remote, branch);
  
  if (mergeRes?.success) {
    // 成功処理
  } else {
    throw new Error(mergeRes?.error || 'Merge failed');
  }
} catch (err) {
  const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
  
  setError(errorMessage);  // ユーザーに表示
  setProgress(prev => [...prev, {
    type: 'merge',
    status: 'error',
    message: `✗ Error: ${errorMessage}`
  }]);
}
```

---

## 実行フローの可視化

### 成功の場合

```
開始
  ↓
[fetch] リモートから最新取得 → 成功
  ↓
[merge] ブランチをマージ
  ↓
競合ファイルなし
  ↓
ReportPage へ遷移（自動）
```

### 競合がある場合

```
開始
  ↓
[fetch] リモートから最新取得 → 成功
  ↓
[merge] ブランチをマージ
  ↓
競合ファイル検出: 3 ファイル
  ↓
MergeResult に競合情報を追加
  ↓
ConflictPage へ遷移（ユーザーが手動で選択）
  ↓
[競合解決]
  ↓
ReportPage へ遷移
```

### エラーの場合

```
開始
  ↓
[fetch] リモートから最新取得 → エラー
  ↓
エラーメッセージ表示
  ↓
「Merge を再試行」（ユーザーが手動で実行）
```

---

## 関連ドキュメント

- **GitService**: `src/git/GitService.ts` - Git 操作の実装
- **IPC ハンドラー**: `src/electron/ipc/gitHandlers.ts` - Electron との通信
- **MergePage**: `src/renderer/pages/MergePage.tsx` - フロントエンド実装
- **型定義**: `src/types/git.ts` - Git 関連の型

---

## 次のステップ

ConflictPage での競合解決ステップ:

```
1. 競合ファイル一覧表示
2. ユーザーが各ファイルの競合を選択
3. 左右差分表示で確認
4. 解決戦略を選択（Upstream/Local/Both）
5. git add + git commit で確定
```

このステップについては、Phase 2-2C で詳細に実装予定です。
