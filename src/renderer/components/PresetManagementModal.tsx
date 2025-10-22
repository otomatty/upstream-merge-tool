import React, { useState, useCallback } from 'react';
import { X, AlertCircle } from 'lucide-react';
import type { ConfigPreset } from '@shared/types/ipc';

interface PresetManagementModalProps {
  isOpen: boolean;
  preset?: ConfigPreset;
  isNew?: boolean;
  onClose: () => void;
  onSave: (preset: ConfigPreset) => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

export default function PresetManagementModal({
  isOpen,
  preset,
  isNew = true,
  onClose,
  onSave,
  isLoading = false,
  error,
}: PresetManagementModalProps) {
  const [name, setName] = useState(preset?.name ?? '');
  const [description, setDescription] = useState(preset?.description ?? '');
  const [localError, setLocalError] = useState<string | null>(null);

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setName(preset?.name ?? '');
      setDescription(preset?.description ?? '');
      setLocalError(null);
    }
  }, [isOpen, preset]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLocalError(null);

      if (!name.trim()) {
        setLocalError('プリセット名は必須です');
        return;
      }

      try {
        const presetToSave: ConfigPreset = {
          id: preset?.id || '',
          name: name.trim(),
          description: description.trim() || undefined,
          createdAt: preset?.createdAt || Date.now(),
          updatedAt: Date.now(),
          isDefault: preset?.isDefault ?? false,
          config: preset?.config ?? {
            upstream_repository_name: '',
            upstream_branch_name: '',
            local_repository_path: '',
            merge_target_branch: 'main',
            custom_code_marker: {
              start: '## BEGIN CUSTOM CODE SECTION',
              end: '## END CUSTOM CODE SECTION',
            },
            upstream_version_tracking: {
              enabled: true,
              type: 'tag',
            },
          },
        };

        await onSave(presetToSave);
        onClose();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error occurred';
        setLocalError(message);
      }
    },
    [name, description, preset, onSave, onClose],
  );

  const displayError = localError || error;

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isNew ? '新しいプリセットを作成' : 'プリセットを編集'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Error Message */}
          {displayError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
              <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{displayError}</p>
            </div>
          )}

          {/* Preset Name */}
          <div>
            <label htmlFor="preset-name" className="block text-sm font-medium text-gray-700 mb-2">
              プリセット名 <span className="text-red-500">*</span>
            </label>
            <input
              id="preset-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: Production Environment"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
              autoFocus
            />
            <p className="mt-1 text-xs text-gray-500">
              このプリセットを識別するための名前
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="preset-desc" className="block text-sm font-medium text-gray-700 mb-2">
              説明（オプション）
            </label>
            <textarea
              id="preset-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="このプリセットについての説明を入力してください"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              プリセットの用途や特徴を記入すると識別しやすくなります
            </p>
          </div>

          {/* Footer */}
          <div className="flex gap-2 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
