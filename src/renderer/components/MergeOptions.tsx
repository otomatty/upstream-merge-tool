import { useState, useEffect, useId } from "react";
import type { ConfigType } from "../../shared/types/ipc";
import { Button } from "@/components/ui/button";

interface MergeOptionsProps {
	config: ConfigType | null;
	onStart: (remote: string, branch: string) => void;
	isDisabled: boolean;
}

export default function MergeOptions({
	config,
	onStart,
	isDisabled,
}: MergeOptionsProps) {
	const [selectedRemote, setSelectedRemote] = useState<string>("");
	const [selectedBranch, setSelectedBranch] = useState<string>("");
	const repoNameId = useId();
	const lastMergeId = useId();
	const mergeTargetId = useId();
	const remoteSelectId = useId();
	const branchInputId = useId();

	useEffect(() => {
		if (config) {
			setSelectedRemote("upstream");
			setSelectedBranch(config.upstream_branch_name);
		}
	}, [config]);

	const handleStart = () => {
		if (selectedRemote && selectedBranch) {
			onStart(selectedRemote, selectedBranch);
		}
	};

	return (
		<div className="bg-white rounded-lg shadow p-6">
			<h2 className="text-xl font-semibold mb-6">Merge Configuration</h2>

			<div className="grid grid-cols-2 gap-6">
				{/* Repository Info */}
				<div>
					<h3 className="text-lg font-medium mb-4">Target Repository</h3>
					{config ? (
						<div className="space-y-3">
							<div>
								<label
									htmlFor={repoNameId}
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Repository Name
								</label>
								<input
									id={repoNameId}
									type="text"
									value={config.upstream_repository_name}
									disabled
									className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-600 cursor-not-allowed"
								/>
							</div>
							<div>
								<label
									htmlFor={lastMergeId}
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Last Merged Commit
								</label>
								<input
									id={lastMergeId}
									type="text"
									value={config.last_merged_upstream_commit}
									disabled
									className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-600 cursor-not-allowed font-mono text-xs"
								/>
							</div>
							<div>
								<label
									htmlFor={mergeTargetId}
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Merge Destination Branch
								</label>
								<input
									id={mergeTargetId}
									type="text"
									value={config.merge_target_branch}
									disabled
									className="w-full px-3 py-2 border border-gray-300 rounded bg-blue-50 text-blue-700 cursor-not-allowed font-medium"
								/>
							</div>
						</div>
					) : (
						<p className="text-gray-500">
							Please load a configuration file first
						</p>
					)}
				</div>

				{/* Merge Options */}
				<div>
					<h3 className="text-lg font-medium mb-4">Merge Target</h3>
					<div className="space-y-3">
						<div>
							<label
								htmlFor={remoteSelectId}
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Remote
							</label>
							<select
								id={remoteSelectId}
								value={selectedRemote}
								onChange={(e) => setSelectedRemote(e.target.value)}
								disabled={isDisabled}
								className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
							>
								<option value="">Select Remote</option>
								<option value="upstream">upstream</option>
								<option value="origin">origin</option>
							</select>
						</div>

						<div>
							<label
								htmlFor={branchInputId}
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Branch
							</label>
							<input
								id={branchInputId}
								type="text"
								value={selectedBranch}
								onChange={(e) => setSelectedBranch(e.target.value)}
								disabled={isDisabled}
								placeholder={config?.upstream_branch_name}
								className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
							/>
						</div>
					</div>
				</div>
			</div>

			{/* Start Button */}
			<div className="mt-8 flex justify-end">
				<Button
					onClick={handleStart}
					disabled={!config || !selectedRemote || !selectedBranch || isDisabled}
				>
					{isDisabled ? "Merging..." : "Start Merge"}
				</Button>
			</div>
		</div>
	);
}
