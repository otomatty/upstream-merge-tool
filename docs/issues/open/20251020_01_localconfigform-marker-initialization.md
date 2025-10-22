日付: 2025-10-20
重要度: Medium
ステータス: 対応中

# LocalConfigForm のカスタムコードマーカー初期化の問題

## 問題の詳細

`LocalConfigForm.tsx` で、カスタムコードマーカーの初期化時に誤った値を参照していました。

### 発見場所

ファイル: `src/renderer/components/LocalConfigForm.tsx` (第25-27行)

### 問題のあるコード

```typescript
const [startMarker, setStartMarker] = useState(
  initialConfig?.local_repository_path ??  // ❌ 間違った値
    '## BEGIN CUSTOM CODE SECTION',
);
```

### なぜこれが問題か

1. `initialConfig?.local_repository_path` はパスのみなので、マーカーの初期値として適切でない
2. IPC 型定義では、カスタムコードマーカーは `CustomCodeConfig` に分けられている
3. `LocalConfig` には含まれていないため、初期化時に undefined になる

### 型の正確な定義

```typescript
// src/shared/types/ipc.ts から
export type LocalConfig = {
  local_repository_path: string;
  merge_target_branch: string;
  last_merged_upstream_commit?: string;
  last_merged_upstream_version?: string;
};

export type CustomCodeConfig = {
  custom_code_marker: {
    start: string;
    end: string;
  };
};

export type PresetConfig = UpstreamConfig & LocalConfig & CustomCodeConfig;
```

## 解決策

### 案1: LocalConfigForm を修正

`LocalConfigForm` の責任を `LocalConfig` のみに限定し、カスタムコードマーカーは別コンポーネントで管理

```typescript
// 修正後
const [startMarker, setStartMarker] = useState('## BEGIN CUSTOM CODE SECTION');
const [endMarker, setEndMarker] = useState('## END CUSTOM CODE SECTION');
```

### 案2: CustomCodeForm コンポーネントを新規作成

カスタムコードマーカー設定を専門の `CustomCodeForm.tsx` コンポーネントに分離

**推奨案**: 案1（即座に修正）+ 案2（Phase 3.5 で検討）

## 関連する設計構造

- Upstream 設定 → `UpstreamConfigForm`
- ローカル設定 → `LocalConfigForm`
- カスタムコード保護 → `LocalConfigForm` 内に統合（現在）または独立化（今後）

## 次のステップ

1. ✅ 問題を記録
2. 🔄 LocalConfigForm を即座に修正
3. 📋 今後、CustomCodeForm への独立化を検討（低優先度）
