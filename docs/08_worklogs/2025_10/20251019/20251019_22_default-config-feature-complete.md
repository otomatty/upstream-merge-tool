# デフォルト設定ファイル機能実装完了

**作成日**: 2025-10-19  
**ステータス**: Phase 2-2A+ 完了 ✅

---

## 1. 実装概要

ConfigPage にデフォルト設定ファイル機能を追加しました。これにより、ユーザーは毎回ファイルを選択する代わりに、デフォルト設定ファイルを設定して自動読み込みできるようになります。

---

## 2. 追加機能

### 2.1 自動読み込み機能 ✅

- **起動時自動読み込み**: アプリ起動時に、デフォルト設定ファイルが設定されている場合は自動的に読み込み
- **バリデーション実行**: 読み込み後に即座にバリデーションを実行
- **成功メッセージ**: 「デフォルト設定ファイルが自動読み込みされました。」

### 2.2 デフォルト設定管理 ✅

- **デフォルトに設定**: 現在読み込んでいるファイルをデフォルトとして保存
- **デフォルトを読み込み**: 別のファイルを選択後、デフォルト設定に戻る
- **デフォルトをクリア**: デフォルト設定を削除

### 2.3 UI エンハンス ✅

- **デフォルト状態表示**: 現在のデフォルトファイル名を表示
- **コンテキストボタン**: 状況に応じて適切なボタンを表示
- **視覚的フィードバック**: 設定ボタンアイコンとカラーリング

---

## 3. IPC 通信の拡張

### 3.1 新規ハンドラー追加

**ファイル**: `src/electron/ipc/configHandlers.ts`

```typescript
// デフォルト設定ファイルのパスを保存
ipcMain.handle('config:setDefaultPath', async (_event, configPath: string) => {
  // app.getPath('userData')/settings/default-config.json に保存
});

// デフォルト設定ファイルのパスを取得
ipcMain.handle('config:getDefaultPath', async (_event): Promise<string | null> => {
  // 保存されたパスを読み込み、ファイル存在チェック
});

// デフォルト設定をクリア
ipcMain.handle('config:clearDefault', async (_event) => {
  // デフォルト設定を null に設定
});
```

### 3.2 保存場所

```
{userData}/settings/default-config.json
{
  "defaultConfigPath": "/path/to/user/config.json"
}
```

- **{userData}**: macOS: `~/Library/Application Support/upstream-merge-tool`
- **存在チェック**: デフォルトパスのファイルが削除された場合は null を返す

---

## 4. ConfigForm コンポーネントの拡張

### 4.1 新規 state 追加

```typescript
const [defaultPath, setDefaultPath] = useState<string | null>(null);
```

### 4.2 新規フック追加

```typescript
// 初期化時の自動読み込み
useEffect(() => {
  const loadDefaultConfig = async () => {
    const defaultConfigPath = await electronAPI.config.getDefaultPath();
    if (defaultConfigPath) {
      setDefaultPath(defaultConfigPath);
      await loadConfigFile(defaultConfigPath);
    }
  };
  loadDefaultConfig();
}, [onValidate]);
```

### 4.3 新規ハンドラー追加

```typescript
// デフォルトに設定
const handleSetAsDefault = useCallback(async () => {
  await electronAPI.config.setDefaultPath(filePath);
  setDefaultPath(filePath);
  setSuccessMessage('デフォルト設定ファイルとして保存されました。');
}, [filePath]);

// デフォルトをクリア
const handleClearDefault = useCallback(async () => {
  await electronAPI.config.clearDefault();
  setDefaultPath(null);
  setSuccessMessage('デフォルト設定をクリアしました。');
}, []);

// デフォルトを再読み込み
const handleLoadDefault = useCallback(async () => {
  if (!defaultPath) return;
  await loadConfigFile(defaultPath);
}, [defaultPath, loadConfigFile]);
```

### 4.4 共通処理の抽出

```typescript
// ファイル読み込み処理を共通化
const loadConfigFile = useCallback(async (path: string) => {
  // 読み込み、バリデーション、UI更新を統合
}, [onValidate]);
```

---

## 5. UI フローの改善

### 5.1 初回起動時

```
┌─ ConfigPage 起動 ─────────────────────────────┐
│                                               │
│ 1. useEffect でデフォルト設定チェック         │
│ 2. デフォルト設定あり？                       │
│    ├─ YES: 自動読み込み実行                   │
│    │       ├─ JSON 表示                       │
│    │       ├─ バリデーション                   │
│    │       └─ 成功メッセージ                   │
│    └─ NO: 空の画面表示                       │
│                                               │
└───────────────────────────────────────────────┘
```

### 5.2 デフォルト設定管理

```
┌─ ファイル選択後 ─────────────────────────────┐
│                                               │
│ [設定済み] test-config.json                  │
│                                               │
│ ┌─ デフォルト設定 (現在未設定) ─────────────┐ │
│ │ [デフォルトに設定] ボタン                 │ │
│ └───────────────────────────────────────────┘ │
│                                               │
│            ↓ クリック                         │
│                                               │
│ ┌─ デフォルト設定 (設定済み) ───────────────┐ │
│ │ 📱 デフォルト: test-config.json [×]       │ │
│ └───────────────────────────────────────────┘ │
│                                               │
└───────────────────────────────────────────────┘
```

### 5.3 別ファイル選択時

```
┌─ 別ファイル選択後 ─────────────────────────┐
│                                               │
│ [設定済み] other-config.json                 │
│                                               │
│ ┌─ デフォルト設定管理 ───────────────────────┐ │
│ │ 📱 デフォルト: test-config.json [×]       │ │
│ │ [デフォルトを読み込み] [デフォルトに設定] │ │
│ └───────────────────────────────────────────┘ │
│                                               │
└───────────────────────────────────────────────┘
```

---

## 6. エラーハンドリング

### 6.1 ファイル削除対応

```typescript
// デフォルトファイルが削除された場合
const defaultConfigPath = getDefaultConfigPath();
if (settings.defaultConfigPath && existsSync(settings.defaultConfigPath)) {
  return settings.defaultConfigPath;
}
return null; // ファイルが存在しない場合
```

### 6.2 設定保存エラー

```typescript
try {
  await electronAPI.config.setDefaultPath(filePath);
} catch (error) {
  setErrors(['デフォルト設定の保存に失敗しました']);
}
```

---

## 7. ユーザー体験の向上

### Before（改善前）
1. アプリ起動
2. 「ファイルを選択」をクリック
3. ファイルダイアログで test-config.json を選択
4. JSON 読み込み完了

### After（改善後）
1. アプリ起動
2. **自動的に test-config.json が読み込まれる** ⚡
3. 即座に作業開始可能

**設定手順**（初回のみ）:
1. 通常通りファイルを選択
2. 「デフォルトに設定」ボタンをクリック
3. 次回起動時から自動読み込み

---

## 8. 技術的詳細

### 8.1 データ永続化

- **保存場所**: Electron の userData ディレクトリ
- **ファイル**: `settings/default-config.json`
- **形式**: `{ "defaultConfigPath": "/absolute/path/to/config.json" }`

### 8.2 ファイル存在チェック

```typescript
// 保存時にパスの妥当性をチェック
const result = await window.electronAPI.config.setDefaultPath(filePath);

// 読み込み時にファイル存在をチェック
if (settings.defaultConfigPath && existsSync(settings.defaultConfigPath)) {
  return settings.defaultConfigPath;
}
```

### 8.3 UI 状態管理

```typescript
// デフォルト設定の状態
defaultPath: string | null

// 条件分岐でボタン表示
{filePath && filePath !== defaultPath && (
  <button onClick={handleSetAsDefault}>デフォルトに設定</button>
)}

{defaultPath && defaultPath !== filePath && (
  <button onClick={handleLoadDefault}>デフォルトを読み込み</button>
)}
```

---

## 9. ファイル変更一覧

| ファイル | 変更タイプ | 追加行数 | 概要 |
|---------|-----------|---------|------|
| `src/electron/ipc/configHandlers.ts` | 拡張 | +45 | デフォルト設定の保存・読み込み・削除 |
| `src/electron/preload.ts` | 拡張 | +3 | IPC 型定義とハンドラー追加 |
| `src/renderer/components/ConfigForm.tsx` | 拡張 | +80 | UI コンポーネント、状態管理、ハンドラー |

**合計**: 約 130 行の追加

---

## 10. テスト手順

### 10.1 基本機能テスト

```bash
# 1. ビルド
bun run dev:build

# 2. 起動
bun start

# 3. テストシナリオ
```

**シナリオ 1: 初回利用**
1. アプリ起動（デフォルト設定なし）
2. test-config.json を選択
3. 「デフォルトに設定」をクリック
4. 成功メッセージ確認

**シナリオ 2: 自動読み込み**
1. アプリ再起動
2. test-config.json が自動読み込みされることを確認
3. 「デフォルト設定ファイルが自動読み込みされました。」メッセージ確認

**シナリオ 3: デフォルト変更**
1. 別ファイルを選択
2. 「デフォルトを読み込み」ボタンで元に戻る
3. 「デフォルトに設定」ボタンで新しいデフォルトを設定

**シナリオ 4: デフォルトクリア**
1. ×ボタンでデフォルト設定をクリア
2. アプリ再起動で自動読み込みされないことを確認

---

## 11. 今後の拡張案

### 11.1 最近使用したファイル

```typescript
// 最近使用したファイルのリスト表示
const [recentFiles, setRecentFiles] = useState<string[]>([]);
```

### 11.2 プロファイル機能

```typescript
// 複数の設定プロファイルを管理
const [profiles, setProfiles] = useState<ConfigProfile[]>([]);
```

### 11.3 設定ファイルテンプレート

```typescript
// よく使う設定のテンプレート機能
const createTemplate = (name: string, config: ConfigType) => { ... };
```

---

## 12. 関連ドキュメント

- **前回の実装**: `docs/08_worklogs/2025_10/20251019_21_configpage-implementation-complete.md`
- **実装計画**: `docs/04_implementation/plans/electron-gui/20251019_03_phase2-2-ui-implementation-plan.md`
- **要件定義**: `docs/02_requirements/features/upstream-merge-tool-requirements.md`

---

## まとめ

🎉 **デフォルト設定ファイル機能** が完了しました！

✅ **自動読み込み**: 起動時にデフォルト設定を自動読み込み  
✅ **デフォルト管理**: 設定・読み込み・クリア機能  
✅ **ユーザビリティ向上**: 毎回ファイル選択が不要に  
✅ **エラーハンドリング**: ファイル削除等に対応  
✅ **永続化**: userData ディレクトリに安全に保存

**次のタスク**: MergePage の実装継続