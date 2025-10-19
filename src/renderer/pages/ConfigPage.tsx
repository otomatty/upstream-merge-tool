import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, Save, Loader } from 'lucide-react';
import type { ConfigType } from '@shared/types/ipc';

interface ConfigPageProps {
  onNext: () => void;
}

export default function ConfigPage({ onNext }: ConfigPageProps) {
  const navigate = useNavigate();
  const [config, setConfig] = useState<ConfigType>({
    upstream_repository_name: '',
    upstream_branch_name: 'main',
    last_merged_upstream_commit: '',
    custom_code_marker: {
      start: '// [custom-start]',
      end: '// [custom-end]',
    },
    upstream_version_tracking: {
      enabled: false,
      type: 'tag',
      value: '',
    },
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const savedConfig = await window.electronAPI.config.load('');
      if (savedConfig) {
        setConfig(savedConfig);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load configuration';
      console.error('Failed to load config:', err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // Validation
      if (!config.upstream_repository_name.trim()) {
        setError('Repository name is required');
        setIsSaving(false);
        return;
      }

      if (!config.upstream_branch_name.trim()) {
        setError('Branch name is required');
        setIsSaving(false);
        return;
      }

      await window.electronAPI.config.save('', config);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onNext();
        navigate('/merge');
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save configuration';
      console.error('Failed to save config:', err);
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8 flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <Loader className="animate-spin text-blue-600" size={24} />
          <p className="text-lg text-gray-700">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Repository Configuration</h1>
        <p className="text-gray-600 mt-2">
          Configure your upstream repository and merge settings
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
          <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
          <p className="text-green-800">Configuration saved successfully!</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        {/* Repository Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Repository Name *
          </label>
          <input
            type="text"
            value={config.upstream_repository_name}
            onChange={(e) =>
              setConfig({
                ...config,
                upstream_repository_name: e.target.value,
              })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            placeholder="e.g., https://github.com/owner/upstream-repo.git"
          />
          <p className="text-xs text-gray-500 mt-1">
            The URL or name of the upstream repository
          </p>
        </div>

        {/* Branch Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Upstream Branch *
          </label>
          <input
            type="text"
            value={config.upstream_branch_name}
            onChange={(e) =>
              setConfig({
                ...config,
                upstream_branch_name: e.target.value,
              })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            placeholder="e.g., main, develop, master"
          />
          <p className="text-xs text-gray-500 mt-1">
            The branch to merge from the upstream repository
          </p>
        </div>

        {/* Last Merged Commit */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Last Merged Upstream Commit
          </label>
          <input
            type="text"
            value={config.last_merged_upstream_commit}
            onChange={(e) =>
              setConfig({
                ...config,
                last_merged_upstream_commit: e.target.value,
              })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono text-sm"
            placeholder="e.g., abc123def456..."
            readOnly
          />
          <p className="text-xs text-gray-500 mt-1">
            Automatically updated after each merge
          </p>
        </div>

        {/* Custom Code Markers */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Custom Code Markers
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Code between these markers will be preserved during merges
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Start Marker
              </label>
              <input
                type="text"
                value={config.custom_code_marker.start}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    custom_code_marker: {
                      ...config.custom_code_marker,
                      start: e.target.value,
                    },
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                End Marker
              </label>
              <input
                type="text"
                value={config.custom_code_marker.end}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    custom_code_marker: {
                      ...config.custom_code_marker,
                      end: e.target.value,
                    },
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono text-sm"
              />
            </div>
          </div>
        </div>

        {/* Version Tracking */}
        <div className="border-t pt-6">
          <div className="flex items-center gap-3 mb-4">
            <input
              type="checkbox"
              id="versionTracking"
              checked={config.upstream_version_tracking?.enabled || false}
              onChange={(e) =>
                setConfig({
                  ...config,
                  upstream_version_tracking: {
                    enabled: e.target.checked,
                    type: config.upstream_version_tracking?.type || 'tag',
                    value: config.upstream_version_tracking?.value || '',
                  },
                })
              }
              className="w-4 h-4 rounded"
            />
            <label htmlFor="versionTracking" className="text-lg font-semibold text-gray-900">
              Enable Version Tracking (Optional)
            </label>
          </div>

          {config.upstream_version_tracking?.enabled && (
            <div className="space-y-4 pl-7">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tracking Type
                </label>
                <select
                  value={config.upstream_version_tracking?.type || 'tag'}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      upstream_version_tracking: {
                        enabled: config.upstream_version_tracking?.enabled ?? true,
                        type: e.target.value as 'tag' | 'package' | 'manual',
                        value: config.upstream_version_tracking?.value || '',
                      },
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="tag">Git Tag</option>
                  <option value="package">Package File (package.json)</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Current Version
                </label>
                <input
                  type="text"
                  value={config.upstream_version_tracking?.value || ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      upstream_version_tracking: {
                        enabled: config.upstream_version_tracking?.enabled ?? true,
                        type: config.upstream_version_tracking?.type || 'tag',
                        value: e.target.value,
                      },
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g., v1.2.3"
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t pt-6 flex gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2 transition"
          >
            {isSaving ? (
              <>
                <Loader size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Configuration
              </>
            )}
          </button>
          <button
            onClick={() => navigate('/merge')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition"
          >
            Skip
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-6 text-center">
        * Required fields
      </p>
    </div>
  );
}
