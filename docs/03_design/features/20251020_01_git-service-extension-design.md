日付: 2025-10-19
実装者: AI Assistant
ステータス: 設計書

# GitService 拡張設計書（ローカルパス・マージ先ブランチ対応）

## 概要

現在の `GitService` は CWD（カレントワーキングディレクトリ）に対してのみ Git 操作を実行しています。GUI からの複数プロジェクト対応を実現するため、`GitService` を拡張して、任意のリポジトリパス指定に対応する必要があります。

---

## 1. 現在の実装

### 1.1 GitService の構造

```typescript
export class GitService {
  constructor(private logger: Logger) {}

  // すべてのメソッドが CWD に対して操作を実行
  async fetch(remoteName: string): Promise<void>
  async merge(remoteName: string, branchName: string): Promise<MergeResult>
  async checkout(branchName: string): Promise<void>
  async getStatus(): Promise<GitStatus>
  // ... その他
}
```

**問題点**:
- CWD（カレントワーキングディレクトリ）固定
- リポジトリパスの明示的指定不可
- 複数リポジトリの同時操作不可

### 1.2 Git コマンド実行方式

```typescript
private async exec(command: string): Promise<CommandResult> {
  // CWD で実行
  const result = await executeCommand(command);
  return result;
}
```

---

## 2. 提案される拡張

### 2.1 拡張方針

**案1: 新しいメソッドを追加（推奨）**
```typescript
class GitService {
  // 既存メソッド（後方互換性のため維持）
  async fetch(remoteName: string): Promise<void>
  
  // 新しいメソッド（パス指定可能）
  async fetchFromPath(repositoryPath: string, remoteName: string): Promise<void>
}
```

**案2: 既存メソッドを拡張**
```typescript
class GitService {
  // 既存: CWD で実行
  async fetch(remoteName: string): Promise<void>
  
  // 拡張: パス指定可能（オプション）
  async fetch(remoteName: string, repositoryPath?: string): Promise<void>
}
```

**選択**: **案1** を推奨（明確性とデバッグ性）

### 2.2 拡張後の API 設計

```typescript
export class GitService {
  constructor(private logger: Logger) {}

  // ========== 既存メソッド（CWD 対象） ==========
  async fetch(remoteName: string): Promise<void>
  async merge(remoteName: string, branchName: string): Promise<MergeResult>
  async checkout(branchName: string): Promise<void>
  async getStatus(): Promise<GitStatus>
  async getConflictFiles(): Promise<string[]>
  async add(filePath: string): Promise<void>
  async getCommitHash(ref: string): Promise<string>
  async getLatestVersionTag(remoteName: string, branchName: string): Promise<string | null>
  async getVersionFromPackageJson(remoteName: string, branchName: string): Promise<string | null>
  async getDiff(fromCommit: string, toCommit: string, filePath: string): Promise<string>

  // ========== 新規メソッド（パス指定対応） ==========
  
  /**
   * Fetch from specified repository
   * @param repositoryPath Absolute path to git repository
   * @param remoteName Remote name (e.g., "upstream")
   */
  async fetchFromPath(repositoryPath: string, remoteName: string): Promise<void>

  /**
   * Merge from specified repository
   * @param repositoryPath Absolute path to git repository
   * @param remoteName Remote name
   * @param branchName Branch name
   * @param targetBranch Target branch to merge into (if different from HEAD)
   */
  async mergeFromPath(
    repositoryPath: string,
    remoteName: string,
    branchName: string,
    targetBranch?: string,
  ): Promise<MergeResult>

  /**
   * Checkout branch in specified repository
   * @param repositoryPath Absolute path to git repository
   * @param branchName Branch name to checkout
   */
  async checkoutFromPath(repositoryPath: string, branchName: string): Promise<void>

  /**
   * Get status of specified repository
   * @param repositoryPath Absolute path to git repository
   */
  async getStatusFromPath(repositoryPath: string): Promise<GitStatus>

  /**
   * Get conflicted files in specified repository
   * @param repositoryPath Absolute path to git repository
   */
  async getConflictFilesFromPath(repositoryPath: string): Promise<string[]>

  /**
   * Add file in specified repository
   * @param repositoryPath Absolute path to git repository
   * @param filePath Relative or absolute path to file
   */
  async addFromPath(repositoryPath: string, filePath: string): Promise<void>

  /**
   * Get commit hash from specified repository
   * @param repositoryPath Absolute path to git repository
   * @param ref Commit reference (branch, tag, SHA, etc.)
   */
  async getCommitHashFromPath(repositoryPath: string, ref: string): Promise<string>

  /**
   * Get latest version tag from specified repository
   * @param repositoryPath Absolute path to git repository
   * @param remoteName Remote name
   * @param branchName Branch name
   */
  async getLatestVersionTagFromPath(
    repositoryPath: string,
    remoteName: string,
    branchName: string,
  ): Promise<string | null>

  /**
   * Get version from package.json in specified repository
   * @param repositoryPath Absolute path to git repository
   * @param remoteName Remote name
   * @param branchName Branch name
   */
  async getVersionFromPackageJsonFromPath(
    repositoryPath: string,
    remoteName: string,
    branchName: string,
  ): Promise<string | null>

  /**
   * Get diff in specified repository
   * @param repositoryPath Absolute path to git repository
   * @param fromCommit From commit SHA
   * @param toCommit To commit SHA
   * @param filePath File path
   */
  async getDiffFromPath(
    repositoryPath: string,
    fromCommit: string,
    toCommit: string,
    filePath: string,
  ): Promise<string>

  /**
   * Validate git repository
   * @param repositoryPath Absolute path to validate
   */
  async isValidRepository(repositoryPath: string): Promise<boolean>

  // ========== ヘルパーメソッド ==========
  private async execInPath(
    command: string,
    repositoryPath?: string,
  ): Promise<CommandResult>
}
```

---

## 3. 実装詳細

### 3.1 ヘルパーメソッド実装

```typescript
/**
 * Execute git command in specified directory
 */
private async execInPath(
  command: string,
  repositoryPath?: string,
): Promise<CommandResult> {
  try {
    this.logger.debug(`Executing command in ${repositoryPath || 'CWD'}: ${command}`);

    let finalCommand = command;
    
    // If repositoryPath is specified, prepend git -C option
    if (repositoryPath) {
      // Escape path for shell
      const escapedPath = repositoryPath.replace(/"/g, '\\"');
      finalCommand = `git -C "${escapedPath}" ${command.replace(/^git\s+/, '')}`;
    }

    const result = await executeCommand(finalCommand);

    this.logger.debug(
      `Command completed with exit code: ${result.exitCode}`,
      {
        command: finalCommand,
        stdout: result.stdout.substring(0, 100),
        stderr: result.stderr.substring(0, 100),
      },
    );

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Command execution failed: ${errorMessage}`);
    throw error;
  }
}

/**
 * Validate if path is a valid git repository
 */
async isValidRepository(repositoryPath: string): Promise<boolean> {
  try {
    const result = await this.execInPath('git rev-parse --git-dir', repositoryPath);
    return result.exitCode === 0;
  } catch (error) {
    this.logger.warn(`Repository validation failed for ${repositoryPath}: ${error}`);
    return false;
  }
}
```

### 3.2 パス対応メソッド実装例

```typescript
/**
 * Fetch from a remote repository (with path support)
 */
async fetchFromPath(repositoryPath: string, remoteName: string): Promise<void> {
  try {
    this.logger.info(`Fetching from remote: ${remoteName} in ${repositoryPath}`);

    // Validate repository
    const isValid = await this.isValidRepository(repositoryPath);
    if (!isValid) {
      throw new Error(`Invalid git repository: ${repositoryPath}`);
    }

    const result = await this.execInPath(`git fetch ${remoteName}`, repositoryPath);

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

/**
 * Merge a branch from a remote repository (with path and target branch support)
 */
async mergeFromPath(
  repositoryPath: string,
  remoteName: string,
  branchName: string,
  targetBranch?: string,
): Promise<MergeResult> {
  try {
    const fullBranchName = `${remoteName}/${branchName}`;
    
    this.logger.info(
      `Starting merge with: ${fullBranchName} in ${repositoryPath}${
        targetBranch ? ` into ${targetBranch}` : ''
      }`,
    );

    // Validate repository
    const isValid = await this.isValidRepository(repositoryPath);
    if (!isValid) {
      throw new Error(`Invalid git repository: ${repositoryPath}`);
    }

    // If targetBranch is specified, checkout first
    if (targetBranch) {
      await this.checkoutFromPath(repositoryPath, targetBranch);
    }

    // Perform merge
    const result = await this.execInPath(
      `git merge ${fullBranchName} --allow-unrelated-histories`,
      repositoryPath,
    );

    if (result.exitCode === 0) {
      this.logger.info('Merge completed successfully without conflicts');
      return {
        success: true,
        conflictFiles: [],
      };
    } else if (result.exitCode === 1) {
      // Merge has conflicts
      const conflictFiles = await this.getConflictFilesFromPath(repositoryPath);
      this.logger.info(`Merge completed with ${conflictFiles.length} conflict files`, {
        conflictFiles,
      });

      return {
        success: false,
        conflictFiles,
      };
    } else {
      throw new Error(
        `Git merge failed with exit code ${result.exitCode}: ${result.stderr}`,
      );
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

/**
 * Checkout branch in specified repository
 */
async checkoutFromPath(repositoryPath: string, branchName: string): Promise<void> {
  try {
    this.logger.info(`Checking out branch: ${branchName} in ${repositoryPath}`);

    const result = await this.execInPath(
      `git checkout ${branchName}`,
      repositoryPath,
    );

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

---

## 4. 既存メソッドへの影響

### 4.1 後方互換性の維持

**既存メソッド（CWD 対象）は変更なし**:
```typescript
async fetch(remoteName: string): Promise<void> {
  return this.fetchFromPath(process.cwd(), remoteName);
}

async merge(remoteName: string, branchName: string): Promise<MergeResult> {
  return this.mergeFromPath(process.cwd(), remoteName, branchName);
}

// ... その他の既存メソッドも同様
```

**メリット**:
- CLI 側のコードは変更なし
- 既存テストケースはそのまま実行可能
- 段階的な移行が可能

---

## 5. 使用例

### 5.1 GUI から複数リポジトリを操作

```typescript
// ConfigPage.tsx
const handleMergeStart = async () => {
  const config = getCurrentConfig(); // プリセットから取得
  
  // Upstream 情報
  const { upstream_repository_name, upstream_branch_name } = config;
  
  // ローカル設定
  const { local_repository_path, merge_target_branch } = config;

  // GitService を使用（新しいメソッド）
  try {
    // 1. Fetch
    await gitService.fetchFromPath(local_repository_path, upstream_repository_name);

    // 2. Merge（指定ブランチにマージ）
    const result = await gitService.mergeFromPath(
      local_repository_path,
      upstream_repository_name,
      upstream_branch_name,
      merge_target_branch, // ← 新規！
    );

    // 3. 処理続行...
  } catch (error) {
    console.error('Merge failed:', error);
  }
};
```

### 5.2 CLI から CWD を操作（既存コード、変更なし）

```typescript
// main.ts (CLI)
async function runMerge(config: Config) {
  try {
    // 既存メソッド（CWD で実行）
    await gitService.fetch(config.upstream_repository_name);
    
    const result = await gitService.merge(
      config.upstream_repository_name,
      config.upstream_branch_name,
    );
    
    // ...
  }
}
```

---

## 6. テスト戦略

### 6.1 テストケース追加

| テストケース | 内容 | 対象メソッド |
|----------|------|---------|
| TC-GIT-PATH-001 | 複数リポジトリのパス指定 | `fetchFromPath` |
| TC-GIT-PATH-002 | 存在しないパスでのエラーハンドリング | `isValidRepository` |
| TC-GIT-PATH-003 | マージ先ブランチ指定でのマージ | `mergeFromPath` |
| TC-GIT-PATH-004 | パス指定時のコンフリクト検出 | `mergeFromPath` |
| TC-GIT-PATH-005 | 相対パスから絶対パスへの正規化 | `execInPath` |
| TC-GIT-PATH-006 | Windows パス対応 | `execInPath` |

### 6.2 既存テストの継続性

- ✅ CLI 既存テスト: 変更なし（275+ テストケース）
- ✅ 互換性確保: 既存メソッドの動作保証
- 新規テスト: 約 15-20 テストケース

---

## 7. 実装スケジュール

### Phase 1: 基盤整備

- ヘルパーメソッド実装（`execInPath`, `isValidRepository`）
- 型定義追加

**工数**: 1-2 時間

### Phase 2: パス対応メソッド実装

- `fetchFromPath`, `mergeFromPath`, `checkoutFromPath` など
- 既存メソッドをリファクタリング

**工数**: 2-3 時間

### Phase 3: テスト・ドキュメント

- 新規テストケース作成
- JSDoc コメント追加
- 使用例ドキュメント

**工数**: 2-3 時間

**推定総工数**: 5-8 時間

---

## 8. 関連する IPC 拡張

### 8.1 MergeHandler での利用

```typescript
// src/electron/ipc/gitHandlers.ts
ipcMain.handle(
  'git:merge',
  async (
    _event,
    repositoryPath: string,
    remoteName: string,
    branchName: string,
    targetBranch?: string,
  ) => {
    return gitService.mergeFromPath(repositoryPath, remoteName, branchName, targetBranch);
  },
);
```

### 8.2 IPC 型定義

```typescript
// src/shared/types/ipc.ts
export type MergeRequest = {
  repositoryPath: string;
  remoteName: string;
  branchName: string;
  targetBranch?: string;
};
```

---

## 9. セキュリティ考慮

### 9.1 パス検証

```typescript
async isValidRepository(repositoryPath: string): Promise<boolean> {
  try {
    // 1. パス存在確認
    if (!existsSync(repositoryPath)) {
      return false;
    }

    // 2. .git ディレクトリ確認
    const gitDir = join(repositoryPath, '.git');
    if (!existsSync(gitDir)) {
      return false;
    }

    // 3. git コマンドで確認
    const result = await this.execInPath('git rev-parse --git-dir', repositoryPath);
    return result.exitCode === 0;
  } catch {
    return false;
  }
}
```

### 9.2 パストラバーサル対策

- `git -C` オプション使用（シェルインジェクション防止）
- パス正規化（`normalize`, `resolve` 使用）
- 絶対パスのみ許可

---

## 10. 今後の拡張

- ローカルブランチの一覧取得
- リモートブランチの一覧取得
- コンフリクト詳細情報の取得
- ロールバック機能

---

## 参考資料

- 既存 GitService: `src/git/GitService.ts`
- 型定義: `src/types/git.ts`
- CLI 実装: `src/main.ts`
- GUI 実装計画: `docs/04_implementation/plans/config-gui-improvement/20251119_01_implementation-plan.md`
