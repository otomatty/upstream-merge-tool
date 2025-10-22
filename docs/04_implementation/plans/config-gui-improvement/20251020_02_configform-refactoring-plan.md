日付: 2025-10-20
実装者: AI Assistant
ステータス: 実装計画中

# ConfigForm リファクタリング計画

## 現在の問題点

1. JSONファイルの読み込み・書き込みベース → 分かりにくい
2. ファイルパス指定が複雑 → OSダイアログのみに簡素化
3. 巨大な単一ファイル (518行) → 機能ごとに分割
4. JSON直編集エディタが混在 → フォーム入力に統一

## 新しい設計

### ディレクトリ構造

```
src/renderer/components/
├── ConfigForm/
│   ├── ConfigForm.tsx           # メインコンポーネント（統合ロジック）
│   ├── BasicConfigSection.tsx   # 基本情報（リポジトリパス、マージ先）
│   ├── UpstreamSection.tsx       # Upstream 設定
│   ├── LocalSection.tsx          # ローカル設定
│   ├── CodeMarkerSection.tsx     # カスタムコード保護マーカー
│   ├── VersionTrackingSection.tsx # バージョン追跡設定
│   └── hooks/
│       └── useConfigForm.ts      # 共有ロジック
```

### 各コンポーネントの責任

| コンポーネント | 責任 |
|-------------|-----|
| `ConfigForm.tsx` | ファイル操作、全体状態管理、バリデーション、セクション統合 |
| `BasicConfigSection.tsx` | ローカルリポジトリ選択、マージ先ブランチ入力 |
| `UpstreamSection.tsx` | リモート名、ブランチ名の入力（`UpstreamConfigForm`と重複排除） |
| `LocalSection.tsx` | 前回マージコミット情報の表示 |
| `CodeMarkerSection.tsx` | カスタムコード保護マーカーの管理 |
| `VersionTrackingSection.tsx` | バージョン追跡設定 |
| `useConfigForm.ts` | フォーム状態管理、バリデーション共通ロジック |

## 実装戦略

### Phase A: フォーム状態管理フック

```typescript
// useConfigForm.ts
export function useConfigForm(initialConfig?: ConfigType) {
  const [config, setConfig] = useState<ConfigType>(...);
  const [errors, setErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);
  
  const validate = () => { ... };
  const updateField = (field: string, value: any) => { ... };
  
  return { config, errors, isValid, validate, updateField };
}
```

### Phase B: セクションコンポーネント

各セクションは独立したコンポーネント、共通インターフェース:

```typescript
interface SectionProps {
  config: Partial<ConfigType>;
  onConfigChange: (config: Partial<ConfigType>) => void;
  errors: string[];
}
```

### Phase C: メインの ConfigForm コンポーネント

1. ファイル操作（保存・読み込み）
2. 全セクションの統合
3. 全体バリデーション
4. ボタンのコントロール

## 利点

✅ **保守性向上**: 各セクションが独立している
✅ **再利用性**: UpstreamConfigForm などとの共用可能
✅ **テスト容易性**: セクション単位でテスト可能
✅ **スケーラビリティ**: 新しいセクションの追加が簡単
✅ **ユーザー体験**: フォーム入力中心で分かりやすい

## 実装順序

1. `src/renderer/components/ConfigForm/` ディレクトリ作成
2. `useConfigForm.ts` 実装
3. `BasicConfigSection.tsx` 実装
4. `UpstreamSection.tsx` 実装（既存 UpstreamConfigForm と統合）
5. `CodeMarkerSection.tsx` 実装
6. `VersionTrackingSection.tsx` 実装
7. `ConfigForm.tsx` 実装（統合・ファイル操作）
8. 既存コンポーネント削除・統合
9. テスト・確認

## リスク

- 既存の ConfigForm に依存するページ・テストの更新が必要
- Preload スクリプトの IPC が正しく機能する必要あり
