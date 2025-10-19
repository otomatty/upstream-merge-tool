import { useLanguage } from "../../contexts/LanguageContext";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface HelpDialogProps {
	isOpen: boolean;
	onClose: () => void;
	pageType: "config" | "merge" | "conflict" | "report";
}

export default function HelpDialog({
	isOpen,
	onClose,
	pageType,
}: HelpDialogProps) {
	const { t } = useLanguage();

	const helpKey = `pages.${pageType}.help`;
	const title = t(`${helpKey}.title`);
	const content = t(`${helpKey}.content`);

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
						{t("common.header.help")}
					</DialogDescription>
				</DialogHeader>

				{/* Body */}
				<div className="py-4">
					<p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
						{content}
					</p>
				</div>

				{/* Footer */}
				<DialogFooter>
					<Button onClick={onClose} variant="default">
						{t("common.close")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
