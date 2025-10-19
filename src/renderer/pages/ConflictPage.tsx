import type { MergeResult } from "../../shared/types/ipc";

interface ConflictPageProps {
	mergeResult: MergeResult | null;
	onNext: () => void;
}

export default function ConflictPage({ mergeResult }: ConflictPageProps) {
	if (!mergeResult) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="text-center">
					<p className="text-gray-600">No merge result available</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full bg-gray-50">
			{/* Header */}
			<div className="bg-white border-b border-gray-200 px-8 py-6">
				<h1 className="text-3xl font-bold text-gray-900">
					Conflict Resolution
				</h1>
				<p className="text-gray-600 mt-1">
					{mergeResult.conflictFiles?.length || 0} file(s) need manual
					resolution
				</p>
			</div>

			{/* Main Content */}
			<div className="flex-1 overflow-auto p-8">
				<div className="max-w-4xl mx-auto">
					<div className="bg-white rounded-lg shadow p-6">
						<p className="text-gray-600 mb-4">
							Conflict resolution page content will go here.
						</p>

						{mergeResult.conflictFiles &&
							mergeResult.conflictFiles.length > 0 && (
								<div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
									<h3 className="font-semibold text-yellow-900 mb-3">
										Files with Conflicts:
									</h3>
									<ul className="space-y-2">
										{mergeResult.conflictFiles.map((file) => (
											<li key={file} className="text-yellow-800">
												• {file}
											</li>
										))}
									</ul>
								</div>
							)}
					</div>
				</div>
			</div>

			{/* Footer Navigation */}
			<div className="bg-white border-t border-gray-200 px-8 py-4 flex justify-end">
				{/* Navigation is handled by StepNavigator */}
			</div>
		</div>
	);
}
