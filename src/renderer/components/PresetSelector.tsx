import React, { useMemo } from 'react';
import { Plus, Copy, Trash2, Star } from 'lucide-react';
import type { ConfigPreset } from '@shared/types/ipc';

interface PresetSelectorProps {
  presets: ConfigPreset[];
  selectedPresetId?: string;
  onSelectPreset: (preset: ConfigPreset) => void;
  onCreateNew: () => void;
  onDuplicate: (presetId: string) => void;
  onDelete: (presetId: string) => void;
  onSetDefault?: (presetId: string) => void;
  isLoading?: boolean;
}

export default function PresetSelector({
  presets,
  selectedPresetId,
  onSelectPreset,
  onCreateNew,
  onDuplicate,
  onDelete,
  onSetDefault,
  isLoading = false,
}: PresetSelectorProps) {
  // Organize presets - default first, then by updated time
  const organizedPresets = useMemo(() => {
    if (!presets || presets.length === 0) {
      return [];
    }

    const defaultPresets = presets.filter((p) => p.isDefault);
    const otherPresets = presets.filter((p) => !p.isDefault);

    return [...defaultPresets, ...otherPresets];
  }, [presets]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Create New Button */}
      <button
        onClick={onCreateNew}
        className="w-full flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus size={18} />
        新しいプリセットを作成
      </button>

      {/* Presets List */}
      {organizedPresets.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">プリセットがまだありません</p>
          <p className="text-gray-400 text-xs mt-1">
            新しいプリセットを作成して開始してください
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {organizedPresets.map((preset) => (
            <div
              key={preset.id}
              className={`flex items-center gap-2 p-3 rounded-lg border transition-all cursor-pointer ${
                selectedPresetId === preset.id
                  ? 'bg-blue-50 border-blue-500'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Preset Info */}
              <div
                className="flex-1 min-w-0"
                onClick={() => onSelectPreset(preset)}
              >
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {preset.name}
                  </h4>
                  {preset.isDefault && (
                    <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-medium">
                      <Star size={12} />
                      Default
                    </span>
                  )}
                </div>
                {preset.description && (
                  <p className="text-xs text-gray-500 truncate mt-1">
                    {preset.description}
                  </p>
                )}
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(preset.updatedAt).toLocaleString('ja-JP')}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Set as Default */}
                {!preset.isDefault && onSetDefault && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetDefault(preset.id);
                    }}
                    className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                    title="デフォルトとして設定"
                  >
                    <Star size={16} />
                  </button>
                )}

                {/* Duplicate */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(preset.id);
                  }}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="複製"
                >
                  <Copy size={16} />
                </button>

                {/* Delete */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`プリセット「${preset.name}」を削除しますか？`)) {
                      onDelete(preset.id);
                    }
                  }}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="削除"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
