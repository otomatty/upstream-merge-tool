import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "../../contexts/ThemeContext";
import { useLanguage } from "../../contexts/LanguageContext";

export default function ThemeSwitcher() {
	const { theme, toggleTheme } = useTheme();
	const { t } = useLanguage();

	return (
		<Button
			type="button"
			onClick={toggleTheme}
			title={t("common.header.theme")}
			variant="ghost"
			size="icon"
			aria-label={t("common.header.theme")}
		>
			{theme === "light" ? <Sun size={20} /> : <Moon size={20} />}
		</Button>
	);
}
