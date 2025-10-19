import { useState, useCallback, useEffect, useRef, useId } from "react";
import {
	FileUp,
	AlertCircle,
	CheckCircle,
	Loader,
	Settings,
	X,
} from "lucide-react";
import type { ConfigType } from "@shared/types/ipc";
import { Button } from "@/components/ui/button";

interface ConfigFormProps {
	onValidate: (
		config: Partial<ConfigType>,
	) => Promise<{ isValid: boolean; errors: string[] }>;
	onConfigLoaded?: (config: ConfigType) => void;
	initialConfig?: ConfigType | null;
}

export default function ConfigForm({
	onValidate,
	onConfigLoaded,
	initialConfig,
}: ConfigFormProps) {
	const [filePath, setFilePath] = useState<string>("");
	const [defaultPath, setDefaultPath] = useState<string | null>(null);
	const [config, setConfig] = useState<Partial<ConfigType>>({
		upstream_repository_name: "",
		upstream_branch_name: "",
		last_merged_upstream_commit: "",
		merge_target_branch: "main",
		custom_code_marker: {
			start: "## BEGIN CUSTOM CODE SECTION",
			end: "## END CUSTOM CODE SECTION",
		},
	});
	const [jsonContent, setJsonContent] = useState<string>("");
	const [errors, setErrors] = useState<string[]>([]);
	const [isValid, setIsValid] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [successMessage, setSuccessMessage] = useState<string>("");
	const initializeRef = useRef(false);
	const repoNameId = useId();
	const upstreamBranchId = useId();
	const mergeTargetId = useId();
	const jsonEditorId = useId();

	// 初期化時にデフォルト設定を読み込む（マウント時のみ）
	// initializeRef.current でガード済みのため、initialConfig と onValidate を依存配列に含める必要はない
	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(() => {
		// eslint-disable-next-line react-hooks/exhaustive-deps
		// 既に初期化済みの場合はスキップ
		if (initializeRef.current) {
			return;
		}
		initializeRef.current = true;

		// 親から initialConfig が渡されている場合は使用
		if (initialConfig) {
			console.log("📝 Using initial config from parent");
			setConfig(initialConfig);
			setJsonContent(JSON.stringify(initialConfig, null, 2));
			setIsValid(true);
			return;
		}

		const loadDefaultConfig = async () => {
			try {
				console.log("⚙️ Initializing ConfigForm - loading default config");

				// Electron環境でない場合はスキップ
				if (!window.electronAPI?.config?.getDefaultPath) {
					console.log(
						"ElectronAPI not available, skipping default config load",
					);
					return;
				}

				const defaultConfigPath =
					await window.electronAPI.config.getDefaultPath();
				console.log("📂 Default config path:", defaultConfigPath);

				if (defaultConfigPath) {
					setDefaultPath(defaultConfigPath);

					// デフォルト設定ファイルを自動読み込み
					const loadedConfig =
						await window.electronAPI.config.load?.(defaultConfigPath);
					if (loadedConfig) {
						setConfig(loadedConfig);
						setJsonContent(JSON.stringify(loadedConfig, null, 2));
						setFilePath(defaultConfigPath);

						// バリデーション実行
						const validationResult = await onValidate(loadedConfig);
						setIsValid(validationResult.isValid);
						setErrors(validationResult.errors);

						if (validationResult.isValid) {
							setSuccessMessage(
								"デフォルト設定ファイルが自動読み込みされました。",
							);
						}
					}
				} else {
					console.log("No default config path found");
				}
			} catch (error) {
				console.error("Failed to load default config:", error);
			}
		};

		loadDefaultConfig();
	}, []);

	// ファイルを読み込む共通処理
	const loadConfigFile = useCallback(
		async (path: string) => {
			try {
				setIsLoading(true);
				setErrors([]);
				setSuccessMessage("");

				const loadedConfig = await window.electronAPI?.config?.load?.(path);
				if (!loadedConfig) {
					setErrors(["設定ファイルの読み込みに失敗しました"]);
					return;
				}
				setConfig(loadedConfig);
				setJsonContent(JSON.stringify(loadedConfig, null, 2));
				setFilePath(path);

				// バリデーション実行
				const validationResult = await onValidate(loadedConfig);
				setIsValid(validationResult.isValid);
				setErrors(validationResult.errors);

				if (validationResult.isValid) {
					setSuccessMessage("設定ファイルが正常に読み込まれました。");
					// 設定が読み込まれたことを親コンポーネントに通知
					onConfigLoaded?.(loadedConfig);
				}
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "不明なエラーが発生しました";
				setErrors([`ファイル読み込みエラー: ${message}`]);
				console.error("File loading error:", error);
			} finally {
				setIsLoading(false);
			}
		},
		[onValidate, onConfigLoaded],
	);

	// ファイル選択ダイアログを開く
	const handleSelectFile = useCallback(async () => {
		try {
			// Electron dialog API を使用してファイルを選択
			const result = await window.electronAPI?.file?.openFile?.({
				filters: [{ name: "JSON Files", extensions: ["json"] }],
			});

			if (result?.filePaths?.[0]) {
				await loadConfigFile(result.filePaths[0]);
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "不明なエラーが発生しました";
			setErrors([`ファイル選択エラー: ${message}`]);
			console.error("File selection error:", error);
		}
	}, [loadConfigFile]);

	// JSON 内容の変更時
	const handleJsonChange = useCallback(
		async (value: string) => {
			setJsonContent(value);
			setSuccessMessage("");

			try {
				const parsed = JSON.parse(value);
				setConfig(parsed);

				// リアルタイムバリデーション
				const validationResult = await onValidate(parsed);
				setIsValid(validationResult.isValid);
				setErrors(validationResult.errors);
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "不正な JSON です";
				setIsValid(false);
				setErrors([message]);
			}
		},
		[onValidate],
	);

	// このファイルをデフォルトとして設定
	const handleSetAsDefault = useCallback(async () => {
		if (!filePath) return;

		if (!window.electronAPI?.config?.setDefaultPath) {
			setErrors(["Electron環境でないため、デフォルト設定を保存できません"]);
			return;
		}

		try {
			console.log("🔧 Setting default path:", filePath);
			await window.electronAPI.config.setDefaultPath?.(filePath);
			setDefaultPath(filePath);
			setSuccessMessage("デフォルト設定ファイルとして保存されました。");
			console.log("✅ Default path set successfully");
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "デフォルト設定の保存に失敗しました";
			setErrors([message]);
			console.error("❌ Failed to set default path:", error);
		}
	}, [filePath]);

	// デフォルト設定をクリア
	const handleClearDefault = useCallback(async () => {
		if (!window.electronAPI?.config?.clearDefault) {
			setErrors(["Electron環境でないため、デフォルト設定をクリアできません"]);
			return;
		}

		try {
			await window.electronAPI.config.clearDefault?.();
			setDefaultPath(null);
			setSuccessMessage("デフォルト設定をクリアしました。");
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "デフォルト設定のクリアに失敗しました";
			setErrors([message]);
		}
	}, []);

	// デフォルト設定を再読み込み
	const handleLoadDefault = useCallback(async () => {
		if (!defaultPath) return;
		await loadConfigFile(defaultPath);
	}, [defaultPath, loadConfigFile]);

	return (
		<div className="space-y-6">
			{/* ファイル選択セクション */}
			<div className="bg-white rounded-lg shadow p-6">
				<h2 className="text-xl font-semibold mb-4">設定ファイルの選択</h2>

				<div className="space-y-4">
					<div>
						<div className="block text-sm font-medium text-gray-700 mb-2">
							設定ファイルパス
						</div>
						<div className="flex gap-2">
							<input
								aria-label="Configuration file path"
								type="text"
								value={filePath}
								readOnly
								placeholder="/path/to/config.json"
								className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
							/>
							<Button onClick={handleSelectFile} disabled={isLoading} size="sm">
								{isLoading ? (
									<Loader className="animate-spin" size={18} />
								) : (
									<FileUp size={18} />
								)}
								ファイルを選択
							</Button>
						</div>

						{/* デフォルト設定コントロール */}
						<div className="mt-3 flex flex-wrap gap-2">
							{/* デバッグ情報 */}
							<div className="w-full text-xs text-gray-500 mb-2 p-2 bg-gray-50 rounded">
								<div>🔧 Debug Info:</div>
								<div>• defaultPath: {defaultPath || "未設定"}</div>
								<div>• filePath: {filePath || "未選択"}</div>
								<div>
									• electronAPI:{" "}
									{window.electronAPI ? "✅ 利用可能" : "❌ 利用不可"}
								</div>
								<div>• 表示される機能:</div>
								<div className="ml-4">
									{defaultPath &&
										`• デフォルト表示: ${defaultPath.split("/").pop()}`}
									{defaultPath &&
										defaultPath !== filePath &&
										`• デフォルト読み込みボタン`}
									{filePath &&
										filePath !== defaultPath &&
										`• デフォルト設定ボタン`}
									{!defaultPath &&
										!filePath &&
										`• まずファイルを選択してください`}
								</div>
							</div>

							{defaultPath && (
								<div className="flex items-center gap-2 text-sm text-gray-600">
									<Settings size={16} />
									<span>デフォルト: {defaultPath.split("/").pop()}</span>
									<Button
										onClick={handleClearDefault}
										variant="ghost"
										size="icon-sm"
										title="デフォルト設定をクリア"
									>
										<X size={16} />
									</Button>
								</div>
							)}

							{defaultPath && defaultPath !== filePath && (
								<Button onClick={handleLoadDefault} variant="outline" size="sm">
									<Settings size={14} />
									デフォルトを読み込み
								</Button>
							)}

							{filePath && filePath !== defaultPath && (
								<Button
									onClick={handleSetAsDefault}
									variant="outline"
									size="sm"
								>
									<Settings size={14} />
									デフォルトに設定
								</Button>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* JSON エディタセクション */}
			<div className="bg-white rounded-lg shadow p-6">
				<h2 className="text-xl font-semibold mb-4">設定内容（JSON）</h2>

				<div className="space-y-4">
					{/* 設定フィールド */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							{/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
							<label htmlFor={repoNameId} className="block text-sm font-medium text-gray-700 mb-2">
								リポジトリ名
							</label>
							<input
								id={repoNameId}
								type="text"
								value={config.upstream_repository_name || ""}
								onChange={(e) =>
									setConfig({
										...config,
										upstream_repository_name: e.target.value,
									})
								}
								placeholder="upstream/repo"
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>

						<div>
							{/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
							<label htmlFor={upstreamBranchId} className="block text-sm font-medium text-gray-700 mb-2">
								アップストリームブランチ
							</label>
							<input
								id={upstreamBranchId}
								type="text"
								value={config.upstream_branch_name || ""}
								onChange={(e) =>
									setConfig({ ...config, upstream_branch_name: e.target.value })
								}
								placeholder="main"
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>

						<div>
							{/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
							<label htmlFor={mergeTargetId} className="block text-sm font-medium text-gray-700 mb-2">
								マージ先ブランチ
							</label>
							<input
								id={mergeTargetId}
								type="text"
								value={config.merge_target_branch || ""}
								onChange={(e) =>
									setConfig({ ...config, merge_target_branch: e.target.value })
								}
								placeholder="main"
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
					</div>

					<div>
						{/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
						<label htmlFor={jsonEditorId} className="block text-sm font-medium text-gray-700 mb-2">
							JSON エディタ
						</label>
						<textarea
							id={jsonEditorId}
							value={jsonContent}
							onChange={(e) => handleJsonChange(e.target.value)}
							placeholder={JSON.stringify(
								{
									upstream_repository_name: "upstream/repo",
									upstream_branch_name: "main",
									last_merged_upstream_commit: "abc123...",
									custom_code_marker: {
										start: "## BEGIN CUSTOM CODE SECTION",
										end: "## END CUSTOM CODE SECTION",
									},
								},
								null,
								2,
							)}
							className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					{/* バリデーション結果 */}
					{errors.length > 0 && (
						<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
							<div className="flex items-start gap-3">
								<AlertCircle
									className="text-red-600 flex-shrink-0 mt-0.5"
									size={20}
								/>
								<div>
									<h3 className="font-semibold text-red-800 mb-2">
										バリデーションエラー
									</h3>
									<ul className="list-disc list-inside space-y-1 text-red-700 text-sm">
										{errors.map((error) => (
											<li key={error}>{error}</li>
										))}
									</ul>
								</div>
							</div>
						</div>
					)}

					{isValid && successMessage && (
						<div className="p-4 bg-green-50 border border-green-200 rounded-lg">
							<div className="flex items-start gap-3">
								<CheckCircle
									className="text-green-600 flex-shrink-0 mt-0.5"
									size={20}
								/>
								<div>
									<h3 className="font-semibold text-green-800">
										{successMessage}
									</h3>
								</div>
							</div>
						</div>
					)}

					{/* 設定内容サマリー */}
					{config.upstream_repository_name && (
						<div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
							<h4 className="font-semibold text-blue-900 mb-2">設定情報</h4>
							<dl className="space-y-1 text-sm text-blue-800">
								<div>
									<dt className="font-medium">リポジトリ:</dt>
									<dd className="text-gray-700">
										{config.upstream_repository_name}
									</dd>
								</div>
								<div>
									<dt className="font-medium">アップストリームブランチ:</dt>
									<dd className="text-gray-700">
										{config.upstream_branch_name}
									</dd>
								</div>
								<div>
									<dt className="font-medium">マージ先ブランチ:</dt>
									<dd className="text-gray-700">
										{config.merge_target_branch || "-"}
									</dd>
								</div>
								<div>
									<dt className="font-medium">最終マージコミット:</dt>
									<dd className="text-gray-700 font-mono text-xs">
										{config.last_merged_upstream_commit?.substring(0, 12)}...
									</dd>
								</div>
							</dl>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
