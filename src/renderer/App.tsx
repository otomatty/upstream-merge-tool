import {
	HashRouter,
	Routes,
	Route,
	Navigate,
	useNavigate,
} from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import type { ConfigType, MergeResult } from "../shared/types/ipc";
import ConfigPage from "./pages/ConfigPage";
import MergePage from "./pages/MergePage";
import ConflictPage from "./pages/ConflictPage";
import ReportPage from "./pages/ReportPage";
import StepNavigator from "./components/StepNavigator";
import AppHeader from "./components/AppHeader/AppHeader";
import { Container } from "@/components/ui/container";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";

function AppContent() {
	const [currentStep, setCurrentStep] = useState<
		"config" | "merge" | "conflict" | "report"
	>("config");
	const [config, setConfig] = useState<ConfigType | null>(null);
	const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);
	const navigate = useNavigate();
	const initializedRef = useRef(false);

	// アプリケーションの初期化（マウント時のみ）
	useEffect(() => {
		if (initializedRef.current) return;
		initializedRef.current = true;

		const initApp = async () => {
			try {
				// デフォルト設定ファイルを取得
				if (window.electronAPI?.config?.getDefaultPath) {
					const defaultPath = await window.electronAPI.config.getDefaultPath();
					if (defaultPath) {
						console.log("📂 Default config path:", defaultPath);
						const loadedConfig =
							await window.electronAPI.config.load?.(defaultPath);
						// デフォルト設定を設定するが、ステップは config のままにする
						if (loadedConfig) {
							setConfig(loadedConfig);
							console.log("✅ Default config loaded");
						}
					}
				}
			} catch (error) {
				console.error("Failed to load initial config:", error);
			}
		};

		initApp();
	}, []);

	// currentStep が変わったとき、ナビゲーションを実行
	useEffect(() => {
		console.log("🔄 Navigating to:", currentStep);
		navigate(`/${currentStep}`);
	}, [currentStep, navigate]);

	const handleConfigLoaded = (loadedConfig: ConfigType) => {
		console.log("Config loaded, moving to merge step");
		setConfig(loadedConfig);
		setCurrentStep("merge");
	};

	const handleMergeComplete = (result: MergeResult) => {
		setMergeResult(result);
		if (result.conflictFiles && result.conflictFiles.length > 0) {
			setCurrentStep("conflict");
		} else {
			setCurrentStep("report");
		}
	};

	return (
		<div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
			<AppHeader currentPage={currentStep} />
			<Container
				as="main"
				maxWidth="7xl"
				px="lg"
				py="md"
				className="flex-1 overflow-auto"
			>
				<Routes>
					<Route path="/" element={<Navigate to="/config" />} />
					<Route
						path="/config"
						element={
							<ConfigPage
								onConfigLoaded={handleConfigLoaded}
								initialConfig={config}
							/>
						}
					/>
					<Route
						path="/merge"
						element={
							<MergePage
								config={config}
								onMergeComplete={handleMergeComplete}
							/>
						}
					/>
					<Route
						path="/conflict"
						element={
							<ConflictPage
								mergeResult={mergeResult}
								onNext={() => setCurrentStep("report")}
							/>
						}
					/>
					<Route
						path="/report"
						element={<ReportPage mergeResult={mergeResult} config={config} />}
					/>
				</Routes>
			</Container>
			<StepNavigator
				currentStep={currentStep}
				config={config}
				mergeResult={mergeResult}
				onStepChange={setCurrentStep}
			/>
		</div>
	);
}

export default function App() {
	return (
		<ThemeProvider>
			<LanguageProvider>
				<HashRouter
					future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
				>
					<AppContent />
				</HashRouter>
			</LanguageProvider>
		</ThemeProvider>
	);
}
