# 共通ヘッダーコンポーネント実装計画

**作成日**: 2025-10-19  
**フェーズ**: Phase 2-2D GUI強化  
**優先度**: HIGH  

---

## 📋 **概要**

すべてのページで表示される共通ヘッダーコンポーネント（AppHeader）を実装します。
このコンポーネントでは以下の機能を提供します：

- **ツール名表示**: "UpstreamMergeTool" をブランディング要素として表示
- **テーマ切り替え**: ライト/ダークモード の切り替え（ツール全体に反映）
- **言語切り替え**: 日本語/英語 の切り替え（ツール全体に反映）
- **使い方説明ダイアログ**: ページに応じたヘルプ情報を表示

---

## 🎯 **実装目標**

| 項目 | 内容 |
|------|------|
| **コンポーネント数** | 2個（AppHeader + HelpDialog） |
| **共有状態管理** | Context API で実装 |
| **永続化** | localStorage で テーマ/言語 を保存 |
| **アクセシビリティ** | ARIA ラベル、キーボード操作対応 |
| **レスポンシブ** | モバイル対応 |

---

## 📂 **ファイル構成**

### 新規作成するファイル

```
src/renderer/
├── components/
│   ├── AppHeader.tsx                    ← 新規
│   ├── HelpDialog.tsx                   ← 新規
│   ├── ThemeSwitcher.tsx                ← 新規
│   ├── LanguageSwitcher.tsx             ← 新規
│   └── ...（既存ファイル）
├── contexts/
│   ├── ThemeContext.tsx                 ← 新規
│   └── LanguageContext.tsx              ← 新規
├── hooks/
│   ├── useTheme.ts                      ← 新規
│   ├── useLanguage.ts                   ← 新規
│   └── ...（既存ファイル）
├── types/
│   ├── theme.ts                         ← 新規
│   ├── language.ts                      ← 新規
│   └── ...（既存ファイル）
├── App.tsx                              ← 修正
└── ...（既存ファイル）
```

### 修正するファイル

```
src/renderer/
├── App.tsx                              ← AppHeader を追加
├── index.tsx                            ← Providers でラップ
├── pages/
│   ├── ConfigPage.tsx                   ← ダイアログ内容をカスタマイズ
│   ├── MergePage.tsx                    ← ダイアログ内容をカスタマイズ
│   ├── ConflictPage.tsx                 ← ダイアログ内容をカスタマイズ
│   └── ReportPage.tsx                   ← ダイアログ内容をカスタマイズ
```

---

## 🏗️ **アーキテクチャ設計**

### 1. **Context による共有状態管理**

```
┌─────────────────────────────────────────┐
│ ThemeProvider + LanguageProvider        │
│  （App.tsx を wrap）                    │
├─────────────────────────────────────────┤
│ AppHeader（ヘッダー）                   │
│  - ThemeSwitcher                        │
│  - LanguageSwitcher                     │
│  - HelpButton                           │
├─────────────────────────────────────────┤
│ Pages（各ページ）                       │
│ - useTheme()                            │
│ - useLanguage()                         │
│ - HelpDialog                            │
│ - ページ固有のコンテンツ                │
└─────────────────────────────────────────┘
```

### 2. **Context API 設計**

#### ThemeContext

```typescript
interface ThemeContextType {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

// localStorage キー
const THEME_STORAGE_KEY = 'umtool:theme';

// デフォルト
const DEFAULT_THEME: 'light' | 'dark' = 'light';
```

#### LanguageContext

```typescript
interface LanguageContextType {
  language: 'ja' | 'en';
  setLanguage: (lang: 'ja' | 'en') => void;
  t: (key: string, ns?: string) => string;  // 翻訳関数
}

// localStorage キー
const LANGUAGE_STORAGE_KEY = 'umtool:language';

// デフォルト
const DEFAULT_LANGUAGE: 'ja' | 'en' = 'ja';
```

### 3. **翻訳システム**

**戦略**: JSON ベースの翻訳ファイル + useLanguage フック

```
src/renderer/locales/
├── ja.json
│   ├── common.header.title
│   ├── common.help
│   ├── pages.config.help
│   ├── pages.merge.help
│   ├── pages.conflict.help
│   └── pages.report.help
├── en.json
│   └── （同じ構造）
```

**例** (`ja.json`):

```json
{
  "common": {
    "header": {
      "title": "UpstreamMergeTool",
      "theme": "テーマ",
      "language": "言語",
      "help": "ヘルプ",
      "light": "ライト",
      "dark": "ダーク"
    }
  },
  "pages": {
    "config": {
      "help": {
        "title": "設定方法",
        "content": "..."
      }
    },
    "merge": {
      "help": {
        "title": "マージの実行方法",
        "content": "..."
      }
    }
  }
}
```

---

## 🎨 **UI/UX 設計**

### 1. **AppHeader のレイアウト**

```
┌──────────────────────────────────────────────────────────────┐
│  UpstreamMergeTool                |  🌙 | 日本語▼ | ❓       │
└──────────────────────────────────────────────────────────────┘
```

**コンポーネント配置**:

- **左側**: ツール名
- **右側**: テーマ切り替え | 言語切り替え | ヘルプボタン

### 2. **ThemeSwitcher コンポーネント**

```tsx
<button
  onClick={() => toggleTheme()}
  title="Switch theme"
  className={`flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700`}
>
  {theme === 'light' ? (
    <Sun size={20} />
  ) : (
    <Moon size={20} />
  )}
</button>
```

**機能**:
- クリックで即座にテーマ切り替え
- 全ページに反映
- localStorage に保存

### 3. **LanguageSwitcher コンポーネント**

```tsx
<select
  value={language}
  onChange={(e) => setLanguage(e.target.value as 'ja' | 'en')}
  className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600"
>
  <option value="ja">日本語</option>
  <option value="en">English</option>
</select>
```

**機能**:
- ドロップダウンで言語を選択
- 全ページに反映（テキスト再レンダリング）
- localStorage に保存

### 4. **HelpDialog コンポーネント**

```tsx
<Dialog isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)}>
  <DialogHeader title={t('pages.config.help.title')} />
  <DialogBody>
    <div className="space-y-4">
      <p>{t('pages.config.help.content')}</p>
      <ul className="list-disc list-inside space-y-2">
        <li>ステップ 1: ...</li>
        <li>ステップ 2: ...</li>
      </ul>
    </div>
  </DialogBody>
  <DialogFooter>
    <button onClick={() => setIsHelpOpen(false)}>
      {t('common.close')}
    </button>
  </DialogFooter>
</Dialog>
```

**特徴**:
- ページ固有のヘルプを表示
- props で `pageType` を受け取り、内容をカスタマイズ
- ダークモード対応

---

## 🔧 **実装の詳細**

### Phase 2-2D-1: Context とフック の実装

#### ファイル: `src/renderer/contexts/ThemeContext.tsx`

```typescript
import { createContext, useContext, useState, useEffect } from 'react';

interface ThemeContextType {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'umtool:theme';
const DEFAULT_THEME = 'light' as const;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return (stored as 'light' | 'dark') || DEFAULT_THEME;
  });

  // DOM に theme クラスを適用
  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

#### ファイル: `src/renderer/contexts/LanguageContext.tsx`

```typescript
import { createContext, useContext, useState, useEffect } from 'react';

type Language = 'ja' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'umtool:language';
const DEFAULT_LANGUAGE: Language = 'ja';

// 翻訳データ（簡略版）
const translations: Record<Language, Record<string, string>> = {
  ja: {
    'common.header.title': 'UpstreamMergeTool',
    'common.header.help': 'ヘルプ',
    'common.header.theme': 'テーマ',
    'common.header.language': '言語',
    'pages.config.help.title': '設定ページの使い方',
    'pages.config.help.content': 'リポジトリ情報を設定します...',
    'pages.merge.help.title': 'マージ実行の使い方',
    'pages.merge.help.content': 'マージを実行します...',
    'pages.conflict.help.title': 'コンフリクト解決の使い方',
    'pages.conflict.help.content': 'コンフリクトを解決します...',
    'pages.report.help.title': 'レポート表示の使い方',
    'pages.report.help.content': 'マージ結果を表示します...',
  },
  en: {
    'common.header.title': 'UpstreamMergeTool',
    'common.header.help': 'Help',
    'common.header.theme': 'Theme',
    'common.header.language': 'Language',
    'pages.config.help.title': 'How to use Config Page',
    'pages.config.help.content': 'Configure repository information...',
    'pages.merge.help.title': 'How to execute Merge',
    'pages.merge.help.content': 'Execute merge process...',
    'pages.conflict.help.title': 'How to resolve Conflicts',
    'pages.conflict.help.content': 'Resolve merge conflicts...',
    'pages.report.help.title': 'How to view Report',
    'pages.report.help.content': 'View merge results...',
  }
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return (stored as Language) || DEFAULT_LANGUAGE;
  });

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    // i18n ライブラリを使用する場合はここで設定
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
```

### Phase 2-2D-2: AppHeader コンポーネント実装

#### ファイル: `src/renderer/components/AppHeader.tsx`

```typescript
import { HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import ThemeSwitcher from './ThemeSwitcher';
import LanguageSwitcher from './LanguageSwitcher';
import HelpDialog from './HelpDialog';

interface AppHeaderProps {
  currentPage: 'config' | 'merge' | 'conflict' | 'report';
}

export default function AppHeader({ currentPage }: AppHeaderProps) {
  const { t } = useLanguage();
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <>
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Left: Title */}
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('common.header.title')}
          </h1>

          {/* Right: Controls */}
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <LanguageSwitcher />
            <button
              onClick={() => setIsHelpOpen(true)}
              title={t('common.header.help')}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
              aria-label={t('common.header.help')}
            >
              <HelpCircle size={20} />
            </button>
          </div>
        </div>
      </header>

      <HelpDialog
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        pageType={currentPage}
      />
    </>
  );
}
```

#### ファイル: `src/renderer/components/ThemeSwitcher.tsx`

```typescript
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();

  return (
    <button
      onClick={toggleTheme}
      title={t('common.header.theme')}
      className="flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
      aria-label={t('common.header.theme')}
    >
      {theme === 'light' ? (
        <Moon size={20} />
      ) : (
        <Sun size={20} />
      )}
    </button>
  );
}
```

#### ファイル: `src/renderer/components/LanguageSwitcher.tsx`

```typescript
import { useLanguage } from '../contexts/LanguageContext';

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <select
      value={language}
      onChange={(e) => setLanguage(e.target.value as 'ja' | 'en')}
      title={t('common.header.language')}
      className="px-3 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 transition cursor-pointer"
      aria-label={t('common.header.language')}
    >
      <option value="ja">日本語</option>
      <option value="en">English</option>
    </select>
  );
}
```

#### ファイル: `src/renderer/components/HelpDialog.tsx`

```typescript
import { X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface HelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pageType: 'config' | 'merge' | 'conflict' | 'report';
}

export default function HelpDialog({ isOpen, onClose, pageType }: HelpDialogProps) {
  const { t } = useLanguage();

  if (!isOpen) return null;

  const helpKey = `pages.${pageType}.help`;
  const title = t(`${helpKey}.title`);
  const content = t(`${helpKey}.content`);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-lg w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
            aria-label="Close help"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 text-gray-700 dark:text-gray-300">
          <p>{content}</p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Phase 2-2D-3: App.tsx の修正

修正内容:
- `ThemeProvider` と `LanguageProvider` で AppContent をラップ
- `AppHeader` を各ページの最上部に配置
- Layout を統一

---

## 📊 **実装フェーズの詳細**

### Phase 2-2D-1: Context とフック実装

**目標**: 状態管理基盤を完成させる

```bash
# 新規作成ファイル
src/renderer/contexts/ThemeContext.tsx
src/renderer/contexts/LanguageContext.tsx
src/renderer/hooks/useTheme.ts       # 簡潔化版（オプション）
src/renderer/hooks/useLanguage.ts    # 簡潔化版（オプション）

# 確認項目
- localStorage に正しく保存される
- Context Provider が正しく動作する
- フックのエラーハンドリング
```

**テスト内容**:
- Theme 切り替えが全ページに反映
- Language 切り替えが全ページに反映
- ブラウザ再起動後も設定が保持される

**所要時間**: 1-2 時間

---

### Phase 2-2D-2: コンポーネント実装

**目標**: AppHeader と関連コンポーネントを完成させる

```bash
# 新規作成ファイル
src/renderer/components/AppHeader.tsx
src/renderer/components/ThemeSwitcher.tsx
src/renderer/components/LanguageSwitcher.tsx
src/renderer/components/HelpDialog.tsx

# 確認項目
- UI が正しくレンダリング
- ボタンが正しく動作
- ダークモード対応
- レスポンシブ対応
- アクセシビリティ対応
```

**テスト内容**:
- 各ボタンのクリック動作
- キーボード操作
- スクリーンリーダー対応

**所要時間**: 2-3 時間

---

### Phase 2-2D-3: 統合とカスタマイズ

**目標**: App.tsx に統合し、各ページのダイアログをカスタマイズ

```bash
# 修正ファイル
src/renderer/App.tsx
src/renderer/index.tsx
src/renderer/pages/ConfigPage.tsx     # ダイアログ内容をカスタマイズ
src/renderer/pages/MergePage.tsx      # ダイアログ内容をカスタマイズ
src/renderer/pages/ConflictPage.tsx   # ダイアログ内容をカスタマイズ
src/renderer/pages/ReportPage.tsx     # ダイアログ内容をカスタマイズ

# 確認項目
- AppHeader がすべてのページに表示
- ページごとのダイアログ内容が正しい
- レイアウト調整
```

**テスト内容**:
- ページ遷移時のヘッダー表示
- ダイアログの内容変更

**所要時間**: 1-2 時間

---

### Phase 2-2D-4: 翻訳とスタイリング調整

**目標**: 完全な多言語対応とダークモード対応

```bash
# 修正ファイル
src/renderer/locales/ja.json          # 新規または修正
src/renderer/locales/en.json          # 新規または修正
src/renderer/styles/tailwind.config.js # ダークモード対応確認
src/renderer/components/*.tsx         # スタイル調整

# 確認項目
- すべてのテキストが翻訳されている
- ダークモードが一貫している
- フォントサイズ、配色が統一
```

**テスト内容**:
- 言語切り替え時にすべてのテキストが変更
- ダークモード切り替えのスムーズさ
- ログの確認

**所要時間**: 1-2 時間

---

## 🧪 **テスト計画**

### Unit テスト

```typescript
// src/__tests__/unit/contexts/ThemeContext.test.tsx
describe('ThemeContext', () => {
  test('should initialize theme from localStorage', () => { ... });
  test('should toggle theme correctly', () => { ... });
  test('should apply theme class to HTML element', () => { ... });
  test('should persist theme to localStorage', () => { ... });
});

// src/__tests__/unit/contexts/LanguageContext.test.tsx
describe('LanguageContext', () => {
  test('should initialize language from localStorage', () => { ... });
  test('should translate keys correctly', () => { ... });
  test('should persist language to localStorage', () => { ... });
});
```

### Integration テスト

```typescript
// src/__tests__/integration/AppHeader.test.tsx
describe('AppHeader Integration', () => {
  test('should render with all controls', () => { ... });
  test('should open and close help dialog', () => { ... });
  test('should switch theme on click', () => { ... });
  test('should switch language on change', () => { ... });
});
```

### E2E テスト

```typescript
// src/__tests__/e2e/header.test.ts
describe('AppHeader E2E', () => {
  test('should persist theme across page reload', () => { ... });
  test('should persist language across page reload', () => { ... });
  test('should display correct help for each page', () => { ... });
});
```

---

## 🎓 **技術的注意点**

### 1. **ダークモード実装**

Tailwind CSS の `dark:` プレフィックスを使用:

```html
<div className="bg-white dark:bg-gray-800">
  Automatic dark mode support
</div>
```

### 2. **言語切り替えのパフォーマンス**

翻訳データが大きくなる場合は i18n ライブラリ（例: i18next）の導入を検討。

### 3. **アクセシビリティ**

- `aria-label` を必ず設定
- キーボード操作対応
- フォーカス管理

### 4. **localStorage の制限**

- 容量制限（通常 5-10MB）
- プライベートブラウジング時に失敗する可能性

---

## 📝 **関連ドキュメント**

- **現在の実装**: `src/renderer/App.tsx`
- **StepNavigator**: `src/renderer/components/StepNavigator.tsx`
- **既存スタイル**: `tailwind.config.js`
- **型定義**: `src/types/`

---

## 📅 **推定スケジュール**

| フェーズ | 内容 | 所要時間 |
|---------|------|--------|
| 2-2D-1 | Context とフック実装 | 1-2h |
| 2-2D-2 | コンポーネント実装 | 2-3h |
| 2-2D-3 | 統合とカスタマイズ | 1-2h |
| 2-2D-4 | 翻訳とスタイリング | 1-2h |
| **テスト** | Unit/Integration/E2E | 2-3h |
| **バグ修正・調整** | 想定外対応 | 1h |
| **計** | | **10-15 時間** |

---

## ✅ **完成チェックリスト**

- [ ] ThemeContext が正常に動作
- [ ] LanguageContext が正常に動作
- [ ] AppHeader が全ページに表示
- [ ] テーマ切り替えがすべてのページに反映
- [ ] 言語切り替えがすべてのページに反映
- [ ] ダークモード対応が完全
- [ ] HelpDialog がページごとに正しい内容を表示
- [ ] localStorage に正しく保存
- [ ] Unit テスト合格
- [ ] Integration テスト合格
- [ ] E2E テスト合格
- [ ] アクセシビリティ対応
- [ ] レスポンシブ対応

---

## 🔗 **次のステップ**

実装計画書完成後、以下の順序で実装:

1. **Phase 2-2D-1**: Context とフック実装（ローカル状態管理テスト）
2. **Phase 2-2D-2**: コンポーネント実装（UI テスト）
3. **Phase 2-2D-3**: 統合（ページ横断テスト）
4. **Phase 2-2D-4**: 翻訳とスタイリング（デザインテスト）
5. **テスト実装**: Unit, Integration, E2E

---

**作成者**: GitHub Copilot  
**最終更新**: 2025-10-19
