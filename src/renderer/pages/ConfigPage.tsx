import { useCallback, useState } from 'react';
import { ConfigForm } from '../components/ConfigForm';
import PresetSelector from '../components/PresetSelector';
import PresetManagementModal from '../components/PresetManagementModal';
import PresetConfigSection from '../components/PresetConfigSection';
import { usePresets } from '../hooks/usePresets';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type {
  ConfigType,
  ConfigPreset,
  UpstreamConfig,
  LocalConfig,
  CustomCodeConfig,
} from '@shared/types/ipc';

interface ConfigPageProps {
  onConfigLoaded: (config: ConfigType) => void;
  initialConfig?: ConfigType | null;
}

type TabType = 'legacy' | 'presets';

export default function ConfigPage({
  onConfigLoaded,
  initialConfig,
}: ConfigPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('legacy');
  const [selectedPresetId, setSelectedPresetId] = useState<string | undefined>();
  const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);
  const [newPresetMode, setNewPresetMode] = useState(true);
  const [editingPreset, setEditingPreset] = useState<ConfigPreset | undefined>();
  const [savingPreset, setSavingPreset] = useState(false);

  // Form state for new/edit preset
  const [upstreamConfig, setUpstreamConfig] = useState<Partial<UpstreamConfig>>({});
  const [localConfig, setLocalConfig] = useState<Partial<LocalConfig>>({});
  const [codeMarker, setCodeMarker] = useState<CustomCodeConfig['custom_code_marker']>({
    start: '## BEGIN CUSTOM CODE SECTION',
    end: '## END CUSTOM CODE SECTION',
  });

  const [upstreamErrors, setUpstreamErrors] = useState<string[]>([]);
  const [localErrors, setLocalErrors] = useState<string[]>([]);
  const [upstreamValid, setUpstreamValid] = useState(false);
  const [localValid, setLocalValid] = useState(false);

  // Preset management
  const { presets, isLoading, savePreset, deletePreset, duplicatePreset, setDefaultPreset } =
    usePresets();

  // Handle preset selection
  const handleSelectPreset = useCallback(
    (preset: ConfigPreset) => {
      setSelectedPresetId(preset.id);
      setUpstreamConfig({
        upstream_repository_name: preset.config.upstream_repository_name,
        upstream_branch_name: preset.config.upstream_branch_name,
        upstream_version_tracking: preset.config.upstream_version_tracking,
      });
      setLocalConfig({
        local_repository_path: preset.config.local_repository_path,
        merge_target_branch: preset.config.merge_target_branch,
      });
      setCodeMarker(preset.config.custom_code_marker);
    },
    [],
  );

  // Handle preset creation
  const handleCreateNew = useCallback(() => {
    setEditingPreset(undefined);
    setNewPresetMode(true);
    setUpstreamConfig({});
    setLocalConfig({});
    setCodeMarker({
      start: '## BEGIN CUSTOM CODE SECTION',
      end: '## END CUSTOM CODE SECTION',
    });
    setIsManagementModalOpen(true);
  }, []);

  // Handle preset duplication
  const handleDuplicate = useCallback(
    async (presetId: string) => {
      const preset = presets.find((p) => p.id === presetId);
      if (!preset) return;

      const newName = `${preset.name} (コピー)`;
      const result = await duplicatePreset(presetId, newName);

      if (result.success && result.presetId) {
        const newPreset = presets.find((p) => p.id === result.presetId);
        if (newPreset) {
          handleSelectPreset(newPreset);
        }
      }
    },
    [presets, duplicatePreset, handleSelectPreset],
  );

  // Handle preset save
  const handleSavePreset = useCallback(
    async (preset: ConfigPreset) => {
      setSavingPreset(true);
      try {
        const updatedPreset: ConfigPreset = {
          ...preset,
          config: {
            ...preset.config,
            ...upstreamConfig,
            ...localConfig,
            custom_code_marker: codeMarker,
          },
        };

        const result = await savePreset(updatedPreset);
        if (result.success && result.presetId) {
          const savedPreset = presets.find((p) => p.id === result.presetId);
          if (savedPreset) {
            handleSelectPreset(savedPreset);
          }
        }
      } finally {
        setSavingPreset(false);
      }
    },
    [upstreamConfig, localConfig, codeMarker, savePreset, presets, handleSelectPreset],
  );

  // Handle preset deletion
  const handleDeletePreset = useCallback(
    async (presetId: string) => {
      await deletePreset(presetId);
      if (selectedPresetId === presetId) {
        setSelectedPresetId(undefined);
      }
    },
    [selectedPresetId, deletePreset],
  );

  // Legacy validation for ConfigForm
  const handleValidate = useCallback(async (config: Partial<ConfigType>) => {
    try {
      const validationResult = await window.electronAPI?.config?.validate?.(
        config as ConfigType,
      );
      if (validationResult) {
        return {
          isValid: validationResult.valid,
          errors: validationResult.errors,
        };
      }
      return { isValid: false, errors: ['Validation not available'] };
    } catch (error) {
      console.error('Validation error:', error);
      return { isValid: false, errors: ['Validation failed'] };
    }
  }, []);

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">設定</h1>
          <p className="text-gray-600">設定内容を確認・編集します。</p>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as TabType)}
          className="mb-8"
        >
          <TabsList>
            <TabsTrigger value="legacy">クイック設定</TabsTrigger>
            <TabsTrigger value="presets">プリセット管理</TabsTrigger>
          </TabsList>

          {/* Legacy Tab */}
          <TabsContent value="legacy" className="mt-6">
            <ConfigForm
              onValidate={handleValidate}
              onConfigLoaded={onConfigLoaded}
              initialConfig={initialConfig}
            />
          </TabsContent>

          {/* Presets Tab */}
          <TabsContent value="presets" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Presets List Sidebar */}
              <div className="lg:col-span-1">
                <div className="sticky top-8">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    保存済みプリセット
                  </h2>
                  <PresetSelector
                    presets={presets}
                    selectedPresetId={selectedPresetId}
                    onSelectPreset={handleSelectPreset}
                    onCreateNew={handleCreateNew}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDeletePreset}
                    onSetDefault={setDefaultPreset}
                    isLoading={isLoading}
                  />
                </div>
              </div>

              {/* Configuration Forms */}
              <div className="lg:col-span-2">
                {selectedPresetId ? (
                  <PresetConfigSection
                    upstreamConfig={upstreamConfig}
                    localConfig={localConfig}
                    codeMarker={codeMarker}
                    upstreamErrors={upstreamErrors}
                    localErrors={localErrors}
                    upstreamValid={upstreamValid}
                    localValid={localValid}
                    savingPreset={savingPreset}
                    onUpstreamConfigChange={setUpstreamConfig}
                    onLocalConfigChange={setLocalConfig}
                    onCodeMarkerChange={setCodeMarker}
                    onUpstreamValidationChange={(isValid, errors) => {
                      setUpstreamValid(isValid);
                      setUpstreamErrors(errors);
                    }}
                    onLocalValidationChange={(isValid, errors) => {
                      setLocalValid(isValid);
                      setLocalErrors(errors);
                    }}
                    onSave={() => {
                      const preset = presets.find(
                        (p) => p.id === selectedPresetId,
                      );
                      if (preset) {
                        setEditingPreset(preset);
                        setNewPresetMode(false);
                        setIsManagementModalOpen(true);
                      }
                    }}
                  />
                ) : (
                  <Card className="bg-white border border-gray-200">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <p className="text-gray-500 mb-4">
                        プリセットを選択するか、新規作成してください
                      </p>
                      <Button onClick={handleCreateNew} size="lg">
                        新しいプリセットを作成
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Preset Management Modal */}
        <PresetManagementModal
          isOpen={isManagementModalOpen}
          preset={editingPreset}
          isNew={newPresetMode}
          onClose={() => setIsManagementModalOpen(false)}
          onSave={handleSavePreset}
          isLoading={savingPreset}
        />
      </div>
    </div>
  );
}
