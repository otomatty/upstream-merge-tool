日付: 2025-10-19
実装者: AI Assistant
ステータス: 完了

# GUI 設定ページ改善分析・調査完了レポート

## 概要

マージツールの Electron GUI における設定ページの改善を検討するため、現在の実装状況を詳細に分析しました。

## 1. 現在の実装状況

### 1.1 CLI ツール

- **設定方式**: `config.json` ファイル（ハードコード）
- **必須項目**:
  - `upstream_repository_name`: Upstream リモート名
  - `upstream_branch_name`: Upstream ブランチ名
  - `last_merged_upstream_commit`: 前回マージコミット (SHA-1 40文字)
  - `custom_code_marker`: 独自実装部分マーカー
- **オプション項目**:
  - `upstream_version_tracking`: バージョン追跡設定
  - `last_merged_upstream_version`: 前回マージバージョン

### 1.2 現在の GUI 実装

#### ファイル構成
```
src/renderer/
├── App.tsx                          # ルーティング・状態管理
├── pages/
│   ├── ConfigPage.tsx               # 設定ページ
│   ├── MergePage.tsx                # マージ実行ページ
│   ├── ConflictPage.tsx             # 競合解決ページ
│   └── ReportPage.tsx               # レポート表示ページ
└── components/
    ├── ConfigForm.tsx               # 設定フォーム（現在の実装）
    ├── MergeOptions.tsx
    ├── MergeProgress.tsx
    ├── StatusBar.tsx
    └── StepNavigator.tsx
```

#### ConfigForm.tsx の現在の実装

**特徴**:
- ファイル選択ダイアログによる JSON 読み込み
- JSON テキストエリアでの直接編集
- デフォルト設定（1 つ）の管理機能

**保存先**:
- `~/.config/upstream-merge-tool/settings/default-config.json`（設定ファイル参照情報）

**問題点**:
- ❌ 複数設定（プリセット）の管理ができない
- ❌ ローカルリポジトリパスの設定がない
- ❌ マージ先ブランチの指定ができない
- ❌ UI が機械的で、設定項目の意図が不明確
- ❌ ファイル選択による操作の手間
- ❌ JSON 直編集による複雑さ

### 1.3 IPC 通信構造

#### 現在の設定 IPC (`configHandlers.ts`)

```typescript
config:load           // 設定ファイル読み込み
config:save           // 設定ファイル保存
config:validate       // 設定バリデーション
config:setDefaultPath // デフォルト設定パス保存
config:getDefaultPath // デフォルト設定パス取得
config:clearDefault   // デフォルト設定クリア
```

#### 保存メカニズム
```
~/.config/upstream-merge-tool/
└── settings/
    └── default-config.json     # デフォルト設定ファイルのパスを記録
```

---

## 2. 提案される改善概要

### 2.1 主要な変更点

| 項目 | 現在 | 改善後 |
|------|------|--------|
| **設定管理方式** | ファイル選択 | プリセット管理 |
| **複数設定対応** | ❌ | ✅ |
| **ローカルリポジトリパス** | ❌ | ✅ |
| **マージ先ブランチ指定** | ❌ | ✅ |
| **バージョン追跡** | ✅ | ✅ (改善) |
| **UI 体験** | フォーム入力 + JSON 編集 | タブベースフォーム |
| **自動設定生成** | ❌ | ✅ |

### 2.2 改善後の設定構造

```typescript
// 新しいプリセット型
ConfigPreset = {
  id: string;                       // UUID
  name: string;                     // プリセット名（ユーザー入力可）
  description?: string;             // 説明
  isDefault: boolean;               // デフォルト設定かどうか
  createdAt: number;                // 作成タイムスタンプ
  updatedAt: number;                // 更新タイムスタンプ
  config: {
    // Upstream 情報
    upstream_repository_name: string;
    upstream_branch_name: string;
    upstream_version_tracking?: {...};
    
    // ローカル設定
    local_repository_path: string;      // 新規
    merge_target_branch: string;        // 新規
    
    // メタデータ
    last_merged_upstream_commit?: string;
    last_merged_upstream_version?: string;
    
    // マーカー設定
    custom_code_marker: {
      start: string;
      end: string;
    };
  };
}
```

### 2.3 改善後のプリセット保存構造

```
~/.config/upstream-merge-tool/
├── presets/
│   ├── {uuid-1}.json               # プリセット A
│   ├── {uuid-2}.json               # プリセット B
│   └── {uuid-3}.json               # プリセット C
├── presets-metadata.json           # メタデータ
└── settings.json                   # アプリ全体設定
    {
      "defaultPresetId": "uuid-1",
      "theme": "auto",
      "language": "ja"
    }
```

---

## 3. 実装方針

### 3.1 段階的実装（4フェーズ）

#### Phase 1: 型定義と基盤整備

**実装内容**:
- IPC 型定義の拡張（`ConfigPreset`, `UpstreamConfig` など）
- ディレクトリ構造の準備

**新規ファイル**:
- `src/shared/types/ipc.ts` 拡張

---

#### Phase 2: Electron 側 IPC ハンドラー実装

**実装内容**:
- `PresetManager` クラス（プリセット管理ロジック）
- `presetHandlers` IPC ハンドラー実装

**新規ファイル**:
- `src/config/PresetManager.ts`
- `src/electron/ipc/presetHandlers.ts`

**IPC メソッド**:
```
preset:list            // プリセット一覧取得
preset:save            // プリセット保存
preset:delete          // プリセット削除
preset:load            // プリセット読み込み
preset:setDefault      // デフォルト設定
preset:getDefault      // デフォルト取得
```

---

#### Phase 3: React コンポーネント実装

**新規コンポーネント**:
1. `UpstreamConfigForm` - Upstream 情報フォーム
   - リモート名、ブランチ名入力
   - バージョン追跡設定

2. `LocalConfigForm` - ローカル設定フォーム
   - ローカルリポジトリパス選択
   - マージ先ブランチ名入力
   - カスタムコードマーカー設定

3. `PresetManager` - プリセット管理 UI
   - プリセット一覧表示
   - 作成・編集・削除
   - デフォルト設定

4. `PresetSelector` - プリセット選択
   - リスト表示
   - クイック選択

5. `ConfigValidator` - 検証結果表示（オプション）

**新規フック**:
- `usePresets.ts` - プリセット操作フック

---

#### Phase 4: ConfigPage の再実装

**変更内容**:
- タブベースレイアウト（プリセット、Upstream、ローカル設定）
- 複数フォームの統合
- 保存・読み込みフロー改善
- バリデーション統合

---

### 3.2 既存コードとの互換性

**保持する要素**:
- 既存 CLI マージロジック（変更なし）
- `ConfigManager` のバリデーション（拡張）
- `GitService` の Git 操作（拡張予定）

**拡張が必要な要素**:
- `GitService`: ローカルリポジトリパス指定対応
- `ConfigManager`: 新設定型のバリデーション
- IPC 通信: 新規プリセット関連ハンドラー

---

## 4. 実装時の依存関係

### 4.1 新規実装モジュール間の依存関係

```
presetHandlers (IPC)
    ↓ (使用)
PresetManager
    ↓ (参照)
ConfigPreset (型定義)

ConfigPage
    ↓ (使用)
UpstreamConfigForm
LocalConfigForm
PresetManager UI
    ↓ (使用)
usePresets (フック)
    ↓ (IPC呼び出し)
presetHandlers (IPC)
```

### 4.2 既存モジュールとの連携

```
ConfigManager
    ↑ (拡張)
新しい型定義

GitService
    ↑ (拡張予定)
ローカルパス指定対応
```

---

## 5. セキュリティ考慮事項

### 5.1 パス検証

- ✅ ローカルリポジトリパス: `.git` ディレクトリ存在確認
- ✅ パストラバーサル対策: パス正規化
- ✅ Windows パス対応

### 5.2 設定ファイル保護

- ✅ ユーザー設定ディレクトリ権限: `0700`（所有者のみ）
- ✅ プリセット JSON: 機密情報なし

### 5.3 入力検証

- ✅ リモート名・ブランチ名: 正規表現チェック
- ✅ マーカー文字列: 特殊文字制限
- ✅ すべての外部入力: サニタイズ

---

## 6. テスト戦略

### 6.1 対象

- **ユニットテスト**: `PresetManager`、バリデーション
- **統合テスト**: プリセット作成→読み込み→マージ
- **E2E テスト**: GUI フロー全体

### 6.2 既存テスト

- ✅ CLI マージロジック: 265 テスト（既存）
- 新規 GUI テスト: 計画中

---

## 7. 今後の拡張可能性

### Phase 5 以降（検討中）

- プリセット共有機能（JSON エクスポート/インポート）
- プリセットテンプレート（よく使う設定）
- 設定変更履歴管理
- マージ履歴との連動

---

## 8. 成果物

### 作成されたドキュメント

1. **分析ドキュメント**: 
   - `docs/07_research/2025_10/20251119_01_current-implementation-analysis.md`
   - 現在の実装状況、改善案、具体的な型定義・コンポーネント設計

2. **実装計画書**:
   - `docs/04_implementation/plans/config-gui-improvement/20251119_01_implementation-plan.md`
   - 4 フェーズの実装計画、Phase 3 までの詳細コード例、依存関係

3. **このレポート**:
   - 調査完了サマリー、今後のアクション

---

## 次のステップ

### 推奨される実装順序

1. ✅ **Phase 1**: 型定義拡張（1-2 時間）
2. ✅ **Phase 2**: Electron IPC 実装（2-3 時間）
3. ✅ **Phase 3**: React コンポーネント実装（4-6 時間）
4. ✅ **Phase 4**: ConfigPage 統合（2-3 時間）

**推定総工数**: 10-15 時間

### 即座に対応できる事項

- [ ] 型定義の拡張（Phase 1-1）
- [ ] PresetManager クラスの実装（Phase 2-1）
- [ ] IPC ハンドラー登録（Phase 2-2）

---

## 参考資料

- **現在の要件**: `docs/02_requirements/features/upstream-merge-tool-requirements.md`
- **既存 GUI 提案**: `docs/09_improvements/20251019_01_gui-implementation-proposal.md`
- **実装計画の詳細**: `docs/04_implementation/plans/config-gui-improvement/20251119_01_implementation-plan.md`
- **分析の詳細**: `docs/07_research/2025_10/20251119_01_current-implementation-analysis.md`

---

## 結論

現在のファイル選択ベースの設定方式から、プリセット管理ベースのシステムへの移行は、以下のメリットをもたらします：

### メリット
- 🎯 複数プロジェクト対応
- 🎯 ローカルリポジトリパスの明示的管理
- 🎯 マージ先ブランチの指定可能化
- 🎯 UI/UX の大幅改善
- 🎯 ワンクリックでのプリセット切り替え
- 🎯 設定の自動生成・自動管理

### 必要な投資
- 約 10-15 時間の実装工数
- 既存機能への影響なし（後方互換性維持可能）
- テストケース追加（約 20-30 テスト）

**推奨**: フェーズ 1-3 を優先実装し、ユーザー検証後に Phase 4 を進める
