import { createContext, useContext, useState, useEffect } from "react";

type Language = "ja" | "en";

interface LanguageContextType {
	language: Language;
	setLanguage: (lang: Language) => void;
	t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
	undefined,
);

const LANGUAGE_STORAGE_KEY = "umtool:language";
const DEFAULT_LANGUAGE: Language = "ja";

// 翻訳データ
const translations: Record<Language, Record<string, string>> = {
	ja: {
		"common.header.title": "UpstreamMergeTool",
		"common.header.help": "ヘルプ",
		"common.header.theme": "テーマ",
		"common.header.language": "言語",
		"common.close": "閉じる",
		"pages.config.help.title": "設定ページの使い方",
		"pages.config.help.content":
			"リポジトリ情報を設定して、マージプロセスを開始します。上流リポジトリ(upstream)の情報を入力してください。",
		"pages.merge.help.title": "マージ実行の使い方",
		"pages.merge.help.content":
			"「Start Merge」ボタンをクリックしてマージプロセスを開始します。リモートブランチから最新の変更を取得し、ローカルブランチにマージします。",
		"pages.conflict.help.title": "コンフリクト解決の使い方",
		"pages.conflict.help.content":
			"マージ中にコンフリクトが発生した場合は、左右差分を確認して解決戦略を選択してください。",
		"pages.report.help.title": "レポート表示の使い方",
		"pages.report.help.content":
			"マージの結果をレポートで確認できます。成功した場合はコミットハッシュが表示されます。",
	},
	en: {
		"common.header.title": "UpstreamMergeTool",
		"common.header.help": "Help",
		"common.header.theme": "Theme",
		"common.header.language": "Language",
		"common.close": "Close",
		"pages.config.help.title": "How to use Config Page",
		"pages.config.help.content":
			"Configure repository information and start the merge process. Enter the upstream repository information.",
		"pages.merge.help.title": "How to execute Merge",
		"pages.merge.help.content":
			'Click the "Start Merge" button to start the merge process. Fetch the latest changes from the remote branch and merge them into the local branch.',
		"pages.conflict.help.title": "How to resolve Conflicts",
		"pages.conflict.help.content":
			"If a conflict occurs during merge, review the diff and select a resolution strategy.",
		"pages.report.help.title": "How to view Report",
		"pages.report.help.content":
			"You can see the merge results in the report. If successful, the commit hash will be displayed.",
	},
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
	const [language, setLanguageState] = useState<Language>(() => {
		try {
			const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
			return (stored as Language) || DEFAULT_LANGUAGE;
		} catch {
			// localStorage が利用不可な場合はデフォルト値を返す
			return DEFAULT_LANGUAGE;
		}
	});

	useEffect(() => {
		try {
			localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
		} catch {
			// localStorage に保存できない場合もサイレントに続行
			console.warn("Failed to save language to localStorage");
		}
	}, [language]);

	const setLanguage = (lang: Language) => {
		setLanguageState(lang);
	};

	const t = (key: string): string => {
		const value = translations[language][key];
		if (!value) {
			console.warn(`Translation key not found: ${key}`);
			return key;
		}
		return value;
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
		throw new Error("useLanguage must be used within LanguageProvider");
	}
	return context;
}
