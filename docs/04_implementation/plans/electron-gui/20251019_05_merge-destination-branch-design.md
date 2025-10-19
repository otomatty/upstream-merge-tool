# マージ先ブランチの設定と仕組み

**作成日**: 2025-10-19

---

## 🎯 **結論から**

**マージ先ブランチ（独自アプリのブランチ）は、コマンド実行時の「現在のローカルブランチ」です。**

```bash
# MergePage でユーザーが「Start Merge」をクリック時
$ git merge upstream/main
           ↑ ここは指定される（UI で選択）
# マージ先は自動的に「現在いるブランチ」

# 実際の例
$ git branch -a
  develop
* main      ← この状態でマージを実行
  upstream/main

$ git merge upstream/main
# → main ブランチに upstream/main を統合
```

---

## 📋 **現在の実装を確認**

### 1. MergePage での設定

```typescript
// src/renderer/pages/MergePage.tsx - handleMergeStart()

const handleMergeStart = useCallback(async (remote: string, branch: string) => {
  try {
    // ...
    
    // Step 2: Merge
    const mergeRes = await ipc.git?.merge?.(remote, branch);
    //                                          ↑      ↑
    //                                        remote: branch は UI で選択
    //                                        
    //                                        マージ先は指定されていない！
    //                                        → 現在のブランチが使用される
```

### 2. GitService での実装

```typescript
// src/git/GitService.ts - merge()

async merge(remoteName: string, branchName: string): Promise<MergeResult> {
  try {
    const fullBranchName = `${remoteName}/${branchName}`;
    
    // git merge コマンド実行
    const result = await this.exec(
      `git merge ${fullBranchName} --allow-unrelated-histories`
    );
    //  ↑ マージ元のみ指定
    //    マージ先は Git が自動的に「現在のブランチ」を使用
```

**重要ポイント**:
- `git merge` コマンドでは、マージ先ブランチを明示的に指定しない
- Git は **現在チェックアウトしているブランチ** をマージ先として使用
- `git rev-parse --abbrev-ref HEAD` で確認可能

---

## 🔍 **現在のブランチはどこで決まる？**

### 1. ローカルリポジトリの状態に依存

```bash
# アプリ側で git clone / git checkout を事前に実行しておく

# 例: ユーザーがアプリ実行前に以下を実行
$ cd my-app
$ git checkout main
$ git branch -a
  develop
* main      ← ここでアプリを起動
  upstream/main

# アプリでマージを実行
→ main ブランチに upstream/main がマージされる
```

### 2. MergePage では現在のブランチを確認できる

```typescript
// 現在のブランチを確認する実装例
const status = await ipc.git?.status?.();

// returns:
// {
//   isRepository: true,
//   isDirty: false,
//   branch: "main"  ← ここ！現在のブランチ
// }
```

---

## ⚠️ **潜在的な問題点**

### 1. **マージ先ブランチが明示的に表示されていない**

現在の MergePage の実装:

```tsx
<div className="grid grid-cols-2 gap-6">
  {/* Repository Info */}
  <div>
    <h3 className="text-lg font-medium mb-4">Target Repository</h3>
    {config ? (
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Repository Name
          </label>
          <input value={config.upstream_repository_name} disabled />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Last Merged Commit
          </label>
          <input value={config.last_merged_upstream_commit} disabled />
        </div>
      </div>
    ) : null}
  </div>

  {/* Merge Options */}
  <div>
    <h3 className="text-lg font-medium mb-4">Merge Target</h3>
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Remote
        </label>
        <select value={selectedRemote}>
          <option value="">Select Remote</option>
          <option value="upstream">upstream</option>
          <option value="origin">origin</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Branch
        </label>
        <input
          value={selectedBranch}
          placeholder={config?.upstream_branch_name}
        />
      </div>
    </div>
  </div>
</div>
```

**問題**: マージ先ブランチが表示されていない

### 2. **ユーザーが誤ったブランチでマージしてしまう可能性**

```
例：
1. ユーザーが develop ブランチにいる
2. でも main ブランチとマージしたい場合
3. 現在の実装では対応できない
4. develop に upstream/main がマージされてしまう
```

---

## 🔧 **改善案**

### Phase 2-2C で実装すべき内容

#### 1. **現在のブランチを表示**

```tsx
// MergeOptions.tsx - 改善版

import { useEffect, useState } from 'react';
import type { ConfigType, GitStatus } from '../../shared/types/ipc';
import { useElectronIPC } from '../hooks/useElectronIPC';

interface MergeOptionsProps {
  config: ConfigType | null;
  onStart: (remote: string, branch: string) => void;
  isDisabled: boolean;
}

export default function MergeOptions({ config, onStart, isDisabled }: MergeOptionsProps) {
  const ipc = useElectronIPC();
  const [selectedRemote, setSelectedRemote] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [currentBranch, setCurrentBranch] = useState<string>('');  // 追加

  useEffect(() => {
    if (config) {
      setSelectedRemote('upstream');
      setSelectedBranch(config.upstream_branch_name);
    }
    
    // 現在のブランチを取得
    const loadCurrentBranch = async () => {
      try {
        const status = await ipc.git?.status?.();
        if (status?.branch) {
          setCurrentBranch(status.branch);
        }
      } catch (err) {
        console.error('Failed to get current branch:', err);
      }
    };
    
    loadCurrentBranch();
  }, [config, ipc]);

  const handleStart = () => {
    if (selectedRemote && selectedBranch) {
      onStart(selectedRemote, selectedBranch);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-6">Merge Configuration</h2>

      <div className="grid grid-cols-2 gap-6">
        {/* Merge From */}
        <div>
          <h3 className="text-lg font-medium mb-4">Merge From (Source)</h3>
          {/* ... 既存コード ... */}
        </div>

        {/* Merge To */}
        <div>
          <h3 className="text-lg font-medium mb-4">Merge To (Destination)</h3>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-700 font-semibold">Current Branch</p>
            <p className="text-lg font-mono text-blue-900 mt-1">
              {currentBranch || 'Loading...'}
            </p>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            マージはこのブランチに対して実行されます
          </p>
        </div>
      </div>

      {/* 警告表示 */}
      {currentBranch && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            ⚠️ <strong>{selectedRemote}/{selectedBranch}</strong> を 
            <strong>{currentBranch}</strong> にマージします
          </p>
        </div>
      )}

      {/* Start Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleStart}
          disabled={!config || !selectedRemote || !selectedBranch || isDisabled}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isDisabled ? 'Merging...' : 'Start Merge'}
        </button>
      </div>
    </div>
  );
}
```

#### 2. **ブランチ切り替えオプション（上級）**

```tsx
// さらに高度な実装：UI からブランチを切り替えられるようにする

<div>
  <h3 className="text-lg font-medium mb-4">Merge To (Destination)</h3>
  
  {/* 現在のブランチ表示 */}
  <div className="p-3 bg-gray-100 rounded mb-3">
    <p className="text-sm text-gray-600">Current</p>
    <p className="font-mono font-bold">{currentBranch}</p>
  </div>

  {/* ブランチ切り替えボタン */}
  <div className="space-y-2">
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Or select a different branch
    </label>
    <select
      onChange={(e) => {
        if (e.target.value) {
          // git checkout を実行
          ipc.git?.checkout?.(e.target.value);
          setCurrentBranch(e.target.value);
        }
      }}
      className="w-full px-3 py-2 border border-gray-300 rounded"
    >
      <option value="">Keep current</option>
      <option value="main">main</option>
      <option value="develop">develop</option>
    </select>
  </div>
</div>
```

---

## 📊 **Git マージ先の決定フロー**

```
┌─────────────────────────────────────────────────────┐
│ MergePage: ユーザーが「Start Merge」をクリック      │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ リポジトリの現在の状態を確認                       │
│ $ git rev-parse --abbrev-ref HEAD                   │
│ → main (または develop)                            │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ UI で選択された情報:                                │
│ - リモート: upstream                               │
│ - ブランチ: main                                    │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ Git マージコマンド実行                              │
│ $ git merge upstream/main --allow-unrelated...     │
│                                                     │
│ マージ先 = 現在のブランチ (自動判定)              │
│ マージ元 = upstream/main (UI で指定)              │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ 現在のブランチに upstream/main が統合される        │
│                                                     │
│ 例:                                                 │
│  main に upstream/main がマージ                   │
│  develop に upstream/main がマージ                │
│  (どちらにいるかで決まる)                          │
└─────────────────────────────────────────────────────┘
```

---

## 🎓 **Git における「マージ先」の理解**

### Git コマンドの基本

```bash
# 一般的な git merge の形式
$ git merge <マージ元>

# マージ先は「現在のブランチ」が自動的に使用される

# 例1: main ブランチに develop をマージ
$ git checkout main
$ git merge develop
# → develop の変更が main に統合される

# 例2: develop ブランチに main をマージ
$ git checkout develop
$ git merge main
# → main の変更が develop に統合される
```

### 明示的にマージ先を指定するには？

```bash
# git merge コマンド自体にはマージ先指定オプションがない
# その代わり以下の方法がある:

# 方法1: 事前に checkout する
$ git checkout <マージ先ブランチ>
$ git merge <マージ元>

# 方法2: git rebase (マージ先を明示的に指定可能)
$ git rebase --onto <新base> <古base> <対象ブランチ>

# 方法3: スクリプトで実行
$ git checkout <マージ先ブランチ> && git merge <マージ元>
```

---

## ✅ **推奨される実装（Phase 2-2C）**

### 優先度 HIGH

1. ✅ **現在のブランチを表示**
   - MergeOptions で `currentBranch` を表示
   - Git status から取得

2. ✅ **警告表示**
   - マージ先ブランチを明確に表示
   - ユーザーが誤ってマージしないよう注意喚起

### 優先度 MEDIUM

3. 📋 **ブランチ切り替え機能**
   - UI からブランチを切り替え可能にする
   - `git checkout` を IPC 経由で実行

### 優先度 LOW

4. 📋 **マージプレビュー機能**
   - マージ前にどのようなコミットがマージされるかを表示
   - `git log <マージ元> --not <現在のブランチ>` で実装可能

---

## 📝 **修正が必要なファイル**

| ファイル | 必要な修正 |
|---------|-----------|
| `MergeOptions.tsx` | currentBranch の取得と表示 |
| `MergePage.tsx` | Git status の取得 |
| `gitHandlers.ts` | status ハンドラー（既実装のはず） |
| `GitService.ts` | getStatus メソッド（既実装） |

---

## 🔗 **関連ドキュメント**

- Git merge コマンド仕様: `git merge --help`
- 現在のブランチ確認: `git rev-parse --abbrev-ref HEAD`
- GitService 実装: `src/git/GitService.ts`
- MergeOptions: `src/renderer/components/MergeOptions.tsx`

---

## まとめ

| 項目 | 内容 |
|------|------|
| **マージ先** | 現在チェックアウトしているローカルブランチ |
| **決定タイミング** | git merge コマンド実行時に Git が自動判定 |
| **UIでの表示** | ❌ 現在は表示されていない（改善推奨） |
| **ユーザーの確認方法** | CLI で `git branch` 実行 |
| **改善方法** | MergeOptions で currentBranch を表示 |

**次のステップ**: Phase 2-2C で現在のブランチを表示・管理できるようにしましょう！
