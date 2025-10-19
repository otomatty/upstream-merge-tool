import { createContext, useContext, useState, useEffect } from "react";

interface ThemeContextType {
	theme: "light" | "dark";
	setTheme: (theme: "light" | "dark") => void;
	toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "umtool:theme";
const DEFAULT_THEME = "light" as const;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [theme, setThemeState] = useState<"light" | "dark">(() => {
		try {
			const stored = localStorage.getItem(THEME_STORAGE_KEY);
			return (stored as "light" | "dark") || DEFAULT_THEME;
		} catch {
			// localStorage が利用不可な場合はデフォルト値を返す
			return DEFAULT_THEME;
		}
	});

	// DOM に theme クラスを適用
	useEffect(() => {
		const html = document.documentElement;
		if (theme === "dark") {
			html.classList.add("dark");
		} else {
			html.classList.remove("dark");
		}
		try {
			localStorage.setItem(THEME_STORAGE_KEY, theme);
		} catch {
			// localStorage に保存できない場合もサイレントに続行
			console.warn("Failed to save theme to localStorage");
		}
	}, [theme]);

	const setTheme = (newTheme: "light" | "dark") => {
		setThemeState(newTheme);
	};

	const toggleTheme = () => {
		setThemeState((prev) => (prev === "light" ? "dark" : "light"));
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
		throw new Error("useTheme must be used within ThemeProvider");
	}
	return context;
}
