import { useState, useEffect, useCallback } from "react";
import type {
	ConfigType,
	ProgressEvent,
	MergeResult,
} from "../../shared/types/ipc";
import { useElectronIPC } from "../hooks/useElectronIPC";
import MergeOptions from "../components/MergeOptions";
import MergeProgress from "../components/MergeProgress";

interface MergePageProps {
	config: ConfigType | null;
	onMergeComplete: (result: MergeResult) => void;
}

export default function MergePage({ config, onMergeComplete }: MergePageProps) {
	const ipc = useElectronIPC();

	const [isRunning, setIsRunning] = useState(false);
	const [progress, setProgress] = useState<ProgressEvent[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);

	// Set up progress event listener
	useEffect(() => {
		if (!ipc.git?.onProgress) return;

		const handleProgress = (event: ProgressEvent) => {
			setProgress((prev) => [...prev, event]);
		};

		ipc.git.onProgress(handleProgress);

		return () => {
			// Cleanup if needed
		};
	}, [ipc]);

	const handleMergeStart = useCallback(
		async (remote: string, branch: string) => {
			if (!config) {
				setError("Configuration not loaded");
				return;
			}

			setIsRunning(true);
			setProgress([]);
			setError(null);

			try {
				// Step 1: Fetch from remote
				setProgress((prev) => [
					...prev,
					{
						type: "fetch",
						status: "started",
						message: `Fetching from ${remote}...`,
					},
				]);

				await ipc.git?.fetch?.(remote);

				setProgress((prev) => [
					...prev,
					{
						type: "fetch",
						status: "completed",
						message: `✓ Successfully fetched from ${remote}/${branch}`,
					},
				]);

				// Step 2: Checkout merge destination branch
				setProgress((prev) => [
					...prev,
					{
						type: "checkout",
						status: "started",
						message: `Checking out branch: ${config.merge_target_branch}...`,
					},
				]);

				await ipc.git?.checkout?.(config.merge_target_branch);

				setProgress((prev) => [
					...prev,
					{
						type: "checkout",
						status: "completed",
						message: `✓ Successfully checked out ${config.merge_target_branch}`,
					},
				]);

				// Step 3: Merge
				setProgress((prev) => [
					...prev,
					{
						type: "merge",
						status: "started",
						message: `Merging ${remote}/${branch} into ${config.merge_target_branch}...`,
					},
				]);

				const mergeRes = await ipc.git?.merge?.(remote, branch);

				if (mergeRes?.success) {
					setProgress((prev) => [
						...prev,
						{
							type: "merge",
							status: "completed",
							message: `✓ Merge completed successfully`,
							conflictCount: mergeRes.conflictFiles?.length || 0,
						},
					]);
				} else {
					throw new Error(mergeRes?.error || "Merge failed");
				}

				setMergeResult(mergeRes);
				onMergeComplete(mergeRes);

				// Auto-proceed if no conflicts
				if (!mergeRes.conflictFiles || mergeRes.conflictFiles.length === 0) {
					// Navigation to report will be handled by StepNavigator
					setTimeout(() => {
						// Just wait, StepNavigator will handle navigation
					}, 1500);
				}
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Unknown error occurred";
				setError(errorMessage);
				setProgress((prev) => [
					...prev,
					{
						type: "merge",
						status: "error",
						message: `✗ Error: ${errorMessage}`,
					},
				]);
			} finally {
				setIsRunning(false);
			}
		},
		[config, ipc, onMergeComplete],
	);

	// Navigation is handled by StepNavigator

	return (
		<div className="flex flex-col h-full bg-gray-50">
			{/* Header */}
			<div className="bg-white border-b border-gray-200 px-8 py-6">
				<h1 className="text-3xl font-bold text-gray-900">Git Merge</h1>
				<p className="text-gray-600 mt-1">Execute merge and view progress</p>
			</div>

			{/* Main Content */}
			<div className="flex-1 overflow-auto p-8">
				<div className="max-w-4xl mx-auto space-y-6">
					{/* Config Check */}
					{!config && (
						<div className="p-4 bg-red-50 border border-red-200 rounded">
							<p className="text-red-800">
								❌ Please load a configuration file first on the Config page
							</p>
						</div>
					)}

					{/* Merge Options */}
					<MergeOptions
						config={config}
						onStart={handleMergeStart}
						isDisabled={isRunning}
					/>

					{/* Progress */}
					{(isRunning || progress.length > 0) && (
						<MergeProgress isRunning={isRunning} progress={progress} />
					)}

					{/* Error Display */}
					{error && (
						<div className="p-4 bg-red-50 border border-red-200 rounded">
							<p className="text-red-800">
								<span className="font-semibold">Error:</span> {error}
							</p>
						</div>
					)}

					{/* Merge Result Summary */}
					{mergeResult && !isRunning && (
						<div
							className={`p-4 rounded border ${
								mergeResult.success
									? "bg-green-50 border-green-200"
									: "bg-yellow-50 border-yellow-200"
							}`}
						>
							<div className="flex items-start justify-between">
								<div>
									{mergeResult.success ? (
										<div>
											<p className="text-green-800 font-semibold">
												✓ Merge Successful
											</p>
											{mergeResult.conflictFiles &&
												mergeResult.conflictFiles.length > 0 && (
													<p className="text-yellow-800 mt-1">
														{mergeResult.conflictFiles.length} file(s) with
														conflicts need manual resolution
													</p>
												)}
											{mergeResult.mergedCommit && (
												<p className="text-green-700 text-sm mt-1 font-mono">
													Commit: {mergeResult.mergedCommit}
												</p>
											)}
										</div>
									) : (
										<p className="text-yellow-800 font-semibold">
											⚠️ Merge Incomplete
										</p>
									)}
								</div>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Footer Navigation */}
			{mergeResult && (
				<div className="bg-white border-t border-gray-200 px-8 py-4 flex justify-end">
					{/* Navigation is handled by StepNavigator */}
				</div>
			)}
		</div>
	);
}
