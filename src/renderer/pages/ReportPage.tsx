import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle,
  Download,
  Loader,
  BarChart3,
  Calendar,
  GitCommit,
} from 'lucide-react';
import type { ReportSummary } from '@shared/types/ipc';

export default function ReportPage() {
  const navigate = useNavigate();
  const [reportSummary, setReportSummary] = useState<ReportSummary | null>(
    null
  );
  const [reportDetails, setReportDetails] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const summary = await window.electronAPI.report.getSummary();
      const details = await window.electronAPI.report.getDetails();

      setReportSummary(summary);
      setReportDetails(details);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load report';
      setError(message);
      console.error('Load report error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = () => {
    // PDF export functionality
    console.log('Exporting to PDF...');
    // Implementation will depend on PDF library
  };

  const handleExportCSV = () => {
    // CSV export functionality
    if (!reportSummary) return;

    const csv = [
      ['Merge Report', new Date().toISOString()],
      [],
      ['Status', reportSummary.status],
      ['Merged Commit', reportSummary.mergedCommit],
      ['Total Conflicts', reportSummary.conflictCount],
      ['Resolved', reportSummary.resolvedCount],
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `merge-report-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8 flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <Loader className="animate-spin text-blue-600" size={24} />
          <p className="text-lg text-gray-700">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <div>
            <p className="font-semibold text-red-900">Error</p>
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const statusColor = {
    success: 'text-green-600 bg-green-50 border-green-200',
    partial: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    error: 'text-red-600 bg-red-50 border-red-200',
  };

  const statusIcon = {
    success: CheckCircle,
    partial: AlertCircle,
    error: AlertCircle,
  };

  const StatusIcon = reportSummary
    ? statusIcon[reportSummary.status]
    : CheckCircle;
  const colors = reportSummary
    ? statusColor[reportSummary.status]
    : statusColor.success;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <BarChart3 size={32} className="text-blue-600" />
          Merge Report
        </h1>
        <p className="text-gray-600 mt-2">
          Summary of the upstream merge operation
        </p>
      </div>

      {reportSummary && (
        <>
          {/* Status Summary */}
          <div
            className={`mb-6 p-6 border rounded-lg flex items-center gap-4 ${colors}`}
          >
            <StatusIcon size={32} />
            <div>
              <h2 className="font-bold text-lg capitalize">
                {reportSummary.status === 'success'
                  ? 'Merge Successful'
                  : reportSummary.status === 'partial'
                    ? 'Merge Partially Successful'
                    : 'Merge Failed'}
              </h2>
              <p className="text-sm opacity-75">
                {reportSummary.status === 'success'
                  ? 'All changes have been successfully merged'
                  : reportSummary.status === 'partial'
                    ? 'Some conflicts remain to be resolved'
                    : 'The merge operation encountered errors'}
              </p>
            </div>
          </div>

          {/* Statistics Grid */}
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

          {/* Conflict Statistics */}
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

          {/* Details Section */}
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

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/config')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition"
            >
              Start Over
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition"
            >
              <Download size={18} />
              Export CSV
            </button>

            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition"
            >
              <Download size={18} />
              Export PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}
