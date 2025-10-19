import { HelpCircle } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import ThemeSwitcher from "./ThemeSwitcher";
import LanguageSwitcher from "./LanguageSwitcher";
import HelpDialog from "./HelpDialog";

interface AppHeaderProps {
	currentPage: "config" | "merge" | "conflict" | "report";
}

export default function AppHeader({ currentPage }: AppHeaderProps) {
	const { t } = useLanguage();
	const [isHelpOpen, setIsHelpOpen] = useState(false);

	return (
		<>
			<header className="bg-background border-b border-border shadow-sm">
				<div className="flex items-center justify-between px-6 py-4">
					{/* Left: Title */}
					<h1 className="text-xl font-semibold text-foreground">
						{t("common.header.title")}
					</h1>

					{/* Right: Controls */}
					<div className="flex items-center gap-2">
						<ThemeSwitcher />
						<Separator orientation="vertical" className="h-6" />
						<LanguageSwitcher />
						<Separator orientation="vertical" className="h-6" />
						<Button
							type="button"
							onClick={() => setIsHelpOpen(true)}
							title={t("common.header.help")}
							variant="ghost"
							size="icon"
							aria-label={t("common.header.help")}
						>
							<HelpCircle size={20} />
						</Button>
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
