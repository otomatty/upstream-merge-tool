# Upstream バージョン追跡機能 アーキテクチャ設計書

**作成日**: 2025-10-19  
**最終更新日**: 2025-10-19  
**版**: 1.0

---

## 1. システム設計

### 1.1 全体フロー（バージョン追跡有効時）

```
START
  │
  ├─→ Config 読み込み & 検証
  │    ├─→ 基本設定パース
  │    └─→ バージョン追跡設定の検証
  │
  ├─→ Git 初期化 & Fetch
  │    └─→ Upstream リポジトリから最新情報を取得
  │
  ├─→ バージョン情報の取得（バージョン追跡が有効な場合）
  │    ├─→ タグから最新版を取得（type: "tag"）
  │    │    └─→ フォールバック: package.json → コミット ID
  │    ├─→ package.json から version を取得（type: "package"）
  │    │    └─→ フォールバック: コミット ID
  │    └─→ 手動指定バージョン（type: "manual"）
  │         └─→ フォールバック: コミット ID
  │
  ├─→ git merge 実行
  │    ├─→ コンフリクトなし: 成功 → レポート生成 → END
  │    └─→ コンフリクトあり: 次へ
  │
  ├─→ コンフリクト検出 & 自動解決
  │    └─→ 既存ロジック（変更なし）
  │
  ├─→ レポート生成（バージョン情報を含める）
  │    ├─→ 前回マージバージョン: v1.2.0
  │    ├─→ 今回マージバージョン: v1.3.0
  │    └─→ マージ内容の詳細
  │
  └─→ Config 更新（マージ成功時）
       ├─→ last_merged_upstream_commit を新コミット SHA に更新
       └─→ last_merged_upstream_version を新バージョンに更新
```

### 1.2 モジュール図（変更部分を強調）

```
┌──────────────────────────────────────────────────┐
│          CLI Entry Point (main.ts)               │
│  - コマンドライン解析（変更なし）              │
│  - バージョン取得フロー統合（新規）           │
└────────────────────┬─────────────────────────────┘
                     │
        ┌────────────┼────────────┬──────────────┐
        │            │            │              │
        ▼            ▼            ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────────┐
│   Config     │ │  Git         │ │  Conflict    │ │ Version         │
│   Manager    │ │  Service     │ │  Resolver    │ │ Extractor       │
│              │ │              │ │              │ │                 │
│ + バージョン │ │ + getVersion │ │ （変更なし） │ │ 【新規】        │
│   検証       │ │   (tag/pkg)  │ │              │ │ - タグ取得      │
│ + オプション │ │              │ │              │ │ - package.json  │
│   判定       │ │              │ │              │ │ - 検証・抽出    │
└──────────────┘ └──────────────┘ └──────────────┘ └─────────────────┘
        │            │            │
        └────────────┼────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
    ┌──────────────┐      ┌──────────────┐
    │  Report      │      │  Logger      │
    │  Generator   │      │  Service     │
    │              │      │              │
    │ + バージョン │      │ （変更なし） │
    │   情報表示   │      │              │
    └──────────────┘      └──────────────┘
```

---

## 2. モジュール詳細設計

### 2.1 新規モジュール: VersionExtractor

**責務**: Upstream リポジトリからバージョン情報を取得・検証

```typescript
interface IVersionExtractor {
  // Git タグから最新セマンティックバージョンを取得
  getVersionFromTag(remoteName: string, branchName: string): Promise<string | null>;
  
  // package.json から version フィールドを抽出
  getVersionFromPackageJson(remoteName: string, branchName: string): Promise<string | null>;
  
  // 複数の取得方法を優先度順に試行
  extractVersion(
    remoteName: string,
    branchName: string,
    config: VersionTrackingConfig
  ): Promise<VersionInfo>;
}

interface VersionInfo {
  version: string;
  source: "tag" | "package" | "manual" | "commit"; // version の取得元
  isValid: boolean;
  error?: string; // エラーメッセージ
}

interface VersionTrackingConfig {
  enabled: boolean;
  type?: "tag" | "package" | "manual";
  value?: string; // type が "manual" の場合のバージョン、または "tag" の場合のパターン
}
```

**メソッド詳細**:

#### getVersionFromTag()

```typescript
async getVersionFromTag(remoteName: string, branchName: string): Promise<string | null> {
  try {
    // 最新のセマンティックバージョンタグを取得
    // 対応形式: v1.0.0, v1.2.3, 1.0.0 等
    const result = await this.exec(
      `git tag -l 'v*' --sort=-version:refname --merged ${remoteName}/${branchName} | head -1`
    );
    
    if (result.exitCode === 0 && result.stdout.trim()) {
      const version = result.stdout.trim();
      // バージョン形式の検証
      if (this.isValidSemanticVersion(version)) {
        return version;
      }
    }
    return null;
  } catch (error) {
    this.logger.warn(`Failed to get version from tag: ${error}`);
    return null;
  }
}
```

#### getVersionFromPackageJson()

```typescript
async getVersionFromPackageJson(
  remoteName: string,
  branchName: string
): Promise<string | null> {
  try {
    // Upstream リポジトリの package.json から version を抽出
    const result = await this.exec(
      `git show ${remoteName}/${branchName}:package.json`
    );
    
    if (result.exitCode === 0) {
      const packageJson = JSON.parse(result.stdout);
      if (packageJson.version && typeof packageJson.version === "string") {
        return packageJson.version;
      }
    }
    return null;
  } catch (error) {
    this.logger.warn(`Failed to get version from package.json: ${error}`);
    return null;
  }
}
```

#### extractVersion()

```typescript
async extractVersion(
  remoteName: string,
  branchName: string,
  config: VersionTrackingConfig
): Promise<VersionInfo> {
  // バージョン追跡が無効な場合
  if (!config.enabled) {
    return {
      version: "",
      source: "commit",
      isValid: false,
    };
  }

  try {
    // type に応じた取得を実行
    let version: string | null = null;

    if (config.type === "tag") {
      version = await this.getVersionFromTag(remoteName, branchName);
    } else if (config.type === "package") {
      version = await this.getVersionFromPackageJson(remoteName, branchName);
    } else if (config.type === "manual" && config.value) {
      version = config.value; // 手動指定値をそのまま使用
    }

    // フォールバック処理
    if (!version) {
      // 設定された type が失敗した場合、他の方法を試行
      if (config.type !== "tag") {
        version = await this.getVersionFromTag(remoteName, branchName);
      }
      if (!version && config.type !== "package") {
        version = await this.getVersionFromPackageJson(remoteName, branchName);
      }
    }

    if (version) {
      return {
        version,
        source: config.type || "tag",
        isValid: true,
      };
    }

    // すべて失敗した場合は null を返す（コミット ID にフォールバック）
    return {
      version: "",
      source: "commit",
      isValid: false,
    };
  } catch (error) {
    this.logger.warn(`Error extracting version: ${error}`);
    return {
      version: "",
      source: "commit",
      isValid: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
```

### 2.2 ConfigManager の拡張

```typescript
// 既存の Config インターフェースに追加
interface Config {
  // ... 既存フィールド ...
  last_merged_upstream_version?: string; // 最後にマージしたバージョン
  upstream_version_tracking?: VersionTrackingConfig;
}

interface VersionTrackingConfig {
  enabled: boolean;
  type?: "tag" | "package" | "manual";
  value?: string;
}

// ConfigManager のメソッド追加
class ConfigManager {
  /**
   * バージョン追跡設定を検証
   */
  private validateVersionTracking(
    versionTracking?: VersionTrackingConfig
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!versionTracking) return errors; // オプション

    if (versionTracking.type === "manual" && !versionTracking.value) {
      errors.push("type が 'manual' の場合、value は必須です");
    }

    if (versionTracking.type && !["tag", "package", "manual"].includes(versionTracking.type)) {
      errors.push(`type は 'tag' | 'package' | 'manual' のいずれかである必要があります`);
    }

    return errors;
  }
}
```

### 2.3 GitService の拡張

```typescript
class GitService {
  /**
   * Upstream リポジトリの最新コミット SHA を取得
   */
  async getLatestCommitSha(
    remoteName: string,
    branchName: string
  ): Promise<string> {
    const result = await this.exec(
      `git rev-parse ${remoteName}/${branchName}`
    );

    if (result.exitCode !== 0) {
      throw new Error(`Failed to get commit SHA: ${result.stderr}`);
    }

    return result.stdout.trim();
  }
}
```

### 2.4 ReportGenerator の拡張

```typescript
interface MergeReport {
  // ... 既存フィールド ...
  previousVersion?: string; // 前回マージ時のバージョン
  currentVersion?: string; // 今回マージするバージョン
  versionChangeDescription?: string; // バージョン変更の説明
}

class ReportGenerator {
  /**
   * バージョン情報を含めたレポートを生成
   */
  private formatVersionInfo(report: MergeReport): string {
    if (!report.previousVersion || !report.currentVersion) {
      return "";
    }

    return `
Version Information:
  Previous: ${report.previousVersion}
  Current: ${report.currentVersion}
  ${report.versionChangeDescription ? `Change: ${report.versionChangeDescription}` : ""}
    `.trim();
  }
}
```

---

## 3. 型定義

### 3.1 types/config.ts の追加

```typescript
export interface VersionTrackingConfig {
  enabled: boolean;
  type?: "tag" | "package" | "manual";
  value?: string;
}

export interface Config {
  upstream_repository_name: string;
  upstream_branch_name: string;
  last_merged_upstream_commit: string;
  last_merged_upstream_version?: string; // 新規
  upstream_version_tracking?: VersionTrackingConfig; // 新規
  custom_code_marker: {
    start: string;
    end: string;
  };
}
```

### 3.2 types/git.ts の追加

```typescript
export interface VersionInfo {
  version: string; // 取得したバージョン文字列
  source: "tag" | "package" | "manual" | "commit"; // 取得元
  isValid: boolean; // 有効性フラグ
  error?: string; // エラー情報
}
```

---

## 4. エラーハンドリング戦略

### 4.1 フォールバックの優先度

```
Primary Method (設定に基づく):
  ├─→ 成功 → バージョン情報を使用
  └─→ 失敗 ↓

Fallback Method 1:
  ├─→ 他のバージョン取得方法を試行
  └─→ 失敗 ↓

Fallback Method 2:
  ├─→ コミット SHA を使用（既存動作）
  └─→ 完全フォールバック完了
```

### 4.2 エラーログの出力レベル

| シナリオ | ログレベル | メッセージ例 |
|--------|-----------|-------------|
| バージョン取得成功 | INFO | "Version extracted from tag: v1.2.3" |
| Primary 失敗、Fallback 成功 | WARN | "Failed to get version from tag, using commit SHA instead" |
| すべての方法が失敗 | WARN | "Could not extract version info, falling back to commit ID" |
| バージョン形式が無効 | ERROR | "Invalid version format: abc" |

---

## 5. データフロー

### 5.1 マージ実行時のデータフロー

```
┌─────────────────────────────────┐
│  config.json を読み込み         │
│  - upstream_version_tracking    │
│  - last_merged_upstream_version │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ VersionExtractor.extractVersion │
│  - Tag / package.json から取得  │
│  - フォールバック処理           │
└────────────┬────────────────────┘
             │
             ▼ VersionInfo { version, source, isValid }
             │
┌────────────┴────────────────────┐
│                                 │
│ ConflictResolver (既存処理)    │
│ ReportGenerator (拡張)          │
│                                 │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ マージ成功 → config.json 更新   │
│ - last_merged_upstream_commit   │
│ - last_merged_upstream_version  │
└─────────────────────────────────┘
```

---

## 6. テスト方針

### 6.1 ユニットテスト対象

- `VersionExtractor.getVersionFromTag()`
- `VersionExtractor.getVersionFromPackageJson()`
- `VersionExtractor.extractVersion()` と各フォールバック動作
- `ConfigManager.validateVersionTracking()`

### 6.2 統合テスト対象

- バージョン取得から config.json 更新までの全フロー
- 複数のバージョン取得方法の組み合わせ
- フォールバック動作の検証

### 6.3 E2E テスト対象

- 実際の Git リポジトリを使用したシナリオテスト
- タグベースのマージ、package.json ベースのマージ
- バージョン情報の更新確認

---

## 7. 関連ドキュメント

- **要件定義書**: `docs/02_requirements/features/upstream-version-tracking-requirements.md`
- **テストケース**: `docs/05_testing/test-cases/upstream-merge-tool-test-cases.md`
- **実装計画**: `docs/04_implementation/plans/upstream-merge-tool/`

---

## 8. 今後の拡張可能性

- **セマンティックバージョン比較**: `v1.2.0 → v1.3.0` の差分表示（メジャー/マイナー/パッチ）
- **複数バージョンの追跡**: メインプロジェクト複数のバージョン情報を同時追跡
- **自動バージョン更新**: マージ時に local リポジトリのバージョンも自動更新
- **バージョンチェンジログの生成**: 取得したバージョン情報から自動的に変更ログを生成
