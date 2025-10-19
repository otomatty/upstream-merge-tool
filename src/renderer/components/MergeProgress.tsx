import { useState, useEffect } from 'react';
import type { ProgressEvent } from '../../shared/types/ipc';

interface MergeProgressProps {
  isRunning: boolean;
  progress: ProgressEvent[];
}

export default function MergeProgress({ isRunning, progress }: MergeProgressProps) {
  const [displayMessages, setDisplayMessages] = useState<string[]>([]);

  useEffect(() => {
    setDisplayMessages(progress.map(p => p.message));
  }, [progress]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'started':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mt-6">
      <h2 className="text-xl font-semibold mb-4">Progress</h2>
      
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Merge Status</span>
          {isRunning && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              <span className="flex h-2 w-2 mr-2">
                <span className="animate-pulse inline-flex h-full w-full rounded-full bg-blue-600"></span>
              </span>
              Running
            </span>
          )}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              isRunning ? 'bg-blue-600' : 'bg-green-600'
            }`}
            style={{
              width: isRunning ? '66%' : '100%',
            }}
          ></div>
        </div>
      </div>

      {/* Log Output */}
      <div className="bg-gray-900 rounded p-4 font-mono text-sm max-h-64 overflow-y-auto">
        {displayMessages.length === 0 ? (
          <div className="text-gray-500">Waiting for merge to start...</div>
        ) : (
          <div className="space-y-1">
            {progress.map((event) => (
              <div key={`${event.type}-${event.status}-${event.message}`} className={`${getStatusColor(event.status)} flex items-start`}>
                <span className="mr-2">
                  {event.status === 'completed' && '✓'}
                  {event.status === 'error' && '✗'}
                  {event.status === 'started' && '▶'}
                </span>
                <span className="break-words">{event.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conflict Count */}
      {progress.some(p => p.conflictCount !== undefined) && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            ⚠️ {progress.find(p => p.conflictCount)?.conflictCount || 0} conflicts detected
          </p>
        </div>
      )}
    </div>
  );
}
