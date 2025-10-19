import {
	AlertCircle,
	CheckCircle,
	Download,
	Loader,
	BarChart3,
	Calendar,
	GitCommit,
} from "lucide-react";
import type {
	ReportSummary,
	MergeResult,
	ConfigType,
} from "../../shared/types/ipc";
import { useEffect, useState, useCallback } from "react";

interface ReportPageProps {
	mergeResult: MergeResult | null;
	config: ConfigType | null;
}

export default function ReportPage({ mergeResult }: ReportPageProps) {
	const [reportSummary, setReportSummary] = useState<ReportSummary | null>(
		null,
	);
	const [reportDetails, setReportDetails] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const loadReport = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);

			if (!mergeResult) {
				setError("No merge result available");
				return;
			}

			const summary: ReportSummary = {
				status: mergeResult.success ? "success" : "partial",
				timestamp: new Date().toISOString(),
				mergedCommit: mergeResult.mergedCommit || "N/A",
				conflictCount: mergeResult.conflictFiles?.length || 0,
				resolvedCount: 0,
			};

			setReportSummary(summary);
			setReportDetails(
				JSON.stringify(
					{
						success: mergeResult.success,
						conflictFiles: mergeResult.conflictFiles,
						error: mergeResult.error,
					},
					null,
					2,
				),
			);
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to load report";
			setError(message);
			console.error("Load report error:", err);
		} finally {
			setIsLoading(false);
		}
	}, [mergeResult]);

	useEffect(() => {
		loadReport();
	}, [loadReport]);

	const handleExportCSV = () => {
		if (!reportSummary) return;

		const csv = [
			["Merge Report", new Date().toISOString()],
			[],
			["Status", reportSummary.status],
			["Merged Commit", reportSummary.mergedCommit],
			["Total Conflicts", reportSummary.conflictCount],
			["Resolved", reportSummary.resolvedCount],
		]
			.map((row) => row.join(","))
			.join("\n");

		const blob = new Blob([csv], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `merge-report-${new Date().toISOString()}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="flex items-center gap-3">
					<Loader className="animate-spin text-blue-600" size={24} />
					<p className="text-lg text-gray-700">Loading report...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex flex-col h-full bg-gray-50">
				<div className="bg-white border-b border-gray-200 px-8 py-6">
					<h1 className="text-3xl font-bold text-gray-900">Merge Report</h1>
				</div>
				<div className="flex-1 overflow-auto p-8">
					<div className="max-w-4xl mx-auto">
						<div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
							<AlertCircle className="text-red-600 flex-shrink-0" size={20} />
							<div>
								<p className="font-semibold text-red-900">Error</p>
								<p className="text-red-800">{error}</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	const statusColor: Record<"success" | "partial" | "error", string> = {
		success: "text-green-600 bg-green-50 border-green-200",
		partial: "text-yellow-600 bg-yellow-50 border-yellow-200",
		error: "text-red-600 bg-red-50 border-red-200",
	};

	const currentStatus = (reportSummary?.status || "success") as
		| "success"
		| "partial"
		| "error";
	const statusIcons = {
		success: CheckCircle,
		partial: AlertCircle,
		error: AlertCircle,
	};
	const StatusIcon = statusIcons[currentStatus];

	return (
		<div className="flex flex-col h-full bg-gray-50">
			<div className="bg-white border-b border-gray-200 px-8 py-6">
				<h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
					<BarChart3 size={32} className="text-blue-600" />
					Merge Report
				</h1>
				<p className="text-gray-600 mt-1">
					Summary of the upstream merge operation
				</p>
			</div>

			<div className="flex-1 overflow-auto p-8">
				<div className="max-w-4xl mx-auto">
					{reportSummary && (
						<>
							<div
								className={`mb-6 p-6 border rounded-lg flex items-center gap-4 ${statusColor[currentStatus]}`}
							>
								<StatusIcon size={32} />
								<div>
									<h2 className="font-bold text-lg capitalize">
										{currentStatus === "success"
											? "Merge Successful"
											: currentStatus === "partial"
												? "Merge Partially Successful"
												: "Merge Failed"}
									</h2>
									<p className="text-sm opacity-75">
										{currentStatus === "success"
											? "All changes have been successfully merged"
											: currentStatus === "partial"
												? "Some conflicts remain to be resolved"
												: "The merge operation encountered errors"}
									</p>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4 mb-6">
								<div className="bg-white border border-gray-200 rounded-lg p-6">
									<div className="flex items-center gap-3 mb-2">
										<Calendar size={20} className="text-blue-600" />
										<p className="text-sm text-gray-600 font-semibold">
											Timestamp
										</p>
									</div>
									<p className="text-lg font-bold text-gray-900">
										{new Date(reportSummary.timestamp).toLocaleString()}
									</p>
								</div>

								<div className="bg-white border border-gray-200 rounded-lg p-6">
									<div className="flex items-center gap-3 mb-2">
										<GitCommit size={20} className="text-blue-600" />
										<p className="text-sm text-gray-600 font-semibold">
											Merged Commit
										</p>
									</div>
									<p className="text-lg font-mono text-gray-900 break-all">
										{reportSummary.mergedCommit}
									</p>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4 mb-6">
								<div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
									<p className="text-sm text-blue-600 font-semibold mb-2">
										Total Conflicts Detected
									</p>
									<p className="text-4xl font-bold text-blue-900">
										{reportSummary.conflictCount}
									</p>
								</div>

								<div className="bg-green-50 border border-green-200 rounded-lg p-6">
									<p className="text-sm text-green-600 font-semibold mb-2">
										Resolved
									</p>
									<p className="text-4xl font-bold text-green-900">
										{reportSummary.resolvedCount}
									</p>
								</div>
							</div>

							{reportDetails && (
								<div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
									<h3 className="text-lg font-semibold text-gray-900 mb-4">
										Details
									</h3>
									<pre className="bg-gray-50 p-4 rounded border border-gray-200 overflow-x-auto text-sm font-mono text-gray-800 whitespace-pre-wrap">
										{reportDetails}
									</pre>
								</div>
							)}
						</>
					)}
				</div>
			</div>

			<div className="bg-white border-t border-gray-200 px-8 py-4">
				<div className="max-w-4xl mx-auto flex gap-3">
					{/* Navigation is handled by StepNavigator */}
					<button
						onClick={handleExportCSV}
						className="flex items-center gap-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition"
						type="button"
					>
						<Download size={18} />
						Export CSV
					</button>
				</div>
			</div>
		</div>
	);
}
