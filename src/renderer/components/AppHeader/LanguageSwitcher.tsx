import { useLanguage } from "../../contexts/LanguageContext";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export default function LanguageSwitcher() {
	const { language, setLanguage, t } = useLanguage();

	return (
		<Select
			value={language}
			onValueChange={(value) => setLanguage(value as "ja" | "en")}
		>
			<SelectTrigger
				className="w-[120px]"
				title={t("common.header.language")}
				aria-label={t("common.header.language")}
			>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="ja">日本語</SelectItem>
				<SelectItem value="en">English</SelectItem>
			</SelectContent>
		</Select>
	);
}
