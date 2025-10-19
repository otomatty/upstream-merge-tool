import { useCallback } from "react";
import ConfigForm from "../components/ConfigForm";
import type { ConfigType } from "@shared/types/ipc";

interface ConfigPageProps {
	onConfigLoaded: (config: ConfigType) => void;
	initialConfig?: ConfigType | null;
}

export default function ConfigPage({
	onConfigLoaded,
	initialConfig,
}: ConfigPageProps) {
	const handleValidate = useCallback(
		async (config: Partial<ConfigType>) => {
			try {
				const validationResult = await window.electronAPI?.config?.validate?.(
					config as ConfigType,
				);
				if (validationResult) {
					return { isValid: validationResult.valid, errors: validationResult.errors };
				}
				return { isValid: false, errors: ["Validation not available"] };
			} catch (error) {
				console.error("Validation error:", error);
				return { isValid: false, errors: ["Validation failed"] };
			}
		},
		[],
	);

	return (
		<div className="max-w-4xl mx-auto p-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">設定</h1>
				<p className="text-gray-600">設定内容を確認・編集します。</p>
			</div>

			<ConfigForm
				onValidate={handleValidate}
				onConfigLoaded={onConfigLoaded}
				initialConfig={initialConfig}
			/>
		</div>
	);
}
