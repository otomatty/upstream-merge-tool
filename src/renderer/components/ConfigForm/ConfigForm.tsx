import React, { useCallback, useEffect, useState } from 'react';
import { Save, Upload, Loader, AlertCircle, CheckCircle, ChevronRight } from 'lucide-react';
import BasicConfigSection from './BasicConfigSection';
import UpstreamSection from './UpstreamSection';
import CodeMarkerSection from './CodeMarkerSection';
import JSONPreview from './JSONPreview';
import { useConfigForm } from './useConfigForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ConfigType } from '@shared/types/ipc';

interface ConfigFormProps {
  onValidate?: (
    config: Partial<ConfigType>,
  ) => Promise<{ isValid: boolean; errors: string[] }>;
  onConfigLoaded?: (config: ConfigType) => void;
  initialConfig?: ConfigType | null;
}

export default function ConfigForm({
  onValidate,
  onConfigLoaded,
  initialConfig,
}: ConfigFormProps) {
  const {
    config,
    errors,
    isValid,
    isLoading,
    updateConfig,
    validate,
    loadFromFile,
    saveToFile,
  } = useConfigForm(initialConfig || undefined);

  const [successMessage, setSuccessMessage] = useState<string>('');
  const [lastLoadedPath, setLastLoadedPath] = useState<string>('');

  // Load initial config when component mounts
  useEffect(() => {
    if (initialConfig) {
      console.log('📋 Initial config loaded:', initialConfig);
    }
  }, []);

  // Handle load from file dialog
  const handleLoadFile = useCallback(async () => {
    try {
      const result = await (window as any).electronAPI?.file?.openFile?.({
        properties: ['openFile'],
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (result && !result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        await loadFromFile(filePath);
        setLastLoadedPath(filePath);
        setSuccessMessage('設定を読み込みました');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      console.error('Failed to load file:', error);
    }
  }, [loadFromFile]);

  // Handle save to file dialog
  const handleSaveFile = useCallback(async () => {
    try {
      const result = await (window as any).electronAPI?.file?.openFile?.({
        properties: ['showSaveDialog'],
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (result && !result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        await saveToFile(filePath);
        setLastLoadedPath(filePath);
        setSuccessMessage('設定を保存しました');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  }, [saveToFile]);

  // Handle validation
  const handleValidate = useCallback(async () => {
    const isFormValid = await validate();
    return isFormValid;
  }, [validate]);

  // Handle proceeding to merge page - explicit user action
  const handleProceedToMerge = useCallback(async () => {
    const isFormValid = await validate();
    if (isFormValid) {
      console.log('✅ Config validated, proceeding to merge page');
      onConfigLoaded?.(config);
    } else {
      console.log('❌ Config validation failed, cannot proceed');
    }
  }, [config, validate, onConfigLoaded]);

  return (
    <div className="space-y-8">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={handleLoadFile}
          disabled={isLoading}
          variant="default"
        >
          <Upload className="mr-2 h-4 w-4" />
          設定を読み込む
        </Button>
        <Button
          onClick={handleSaveFile}
          disabled={isLoading || !isValid}
          variant="default"
        >
          <Save className="mr-2 h-4 w-4" />
          設定を保存
        </Button>
        <Button
          onClick={handleValidate}
          disabled={isLoading}
          variant="outline"
        >
          {isLoading ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              検証中...
            </>
          ) : (
            'バリデーション'
          )}
        </Button>
        <Button
          onClick={handleProceedToMerge}
          disabled={isLoading || !isValid}
          variant="default"
          className="ml-auto"
        >
          <span>マージに進む</span>
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-green-800 font-medium">{successMessage}</p>
            {lastLoadedPath && (
              <p className="text-sm text-green-700 mt-1 break-all">{lastLoadedPath}</p>
            )}
          </div>
        </div>
      )}

      {/* Two Column Layout - Upstream and Local Config */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Upstream Config Card */}
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle>マージ元（Upstream）</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-6">
            <UpstreamSection
              config={config}
              onConfigChange={updateConfig}
              errors={errors}
            />
          </CardContent>
        </Card>

        {/* Local Config Card */}
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle>マージ先（Local）</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-6">
            <BasicConfigSection
              config={config}
              onConfigChange={updateConfig}
              errors={errors}
            />
            <CodeMarkerSection
              config={config}
              onConfigChange={updateConfig}
              errors={errors}
            />
          </CardContent>
        </Card>
      </div>

      {/* JSON Preview */}
      <Card>
        <CardHeader>
          <CardTitle>設定プレビュー</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-60 w-full rounded border bg-gray-50 p-4">
            <JSONPreview config={config} />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Validation Status */}
      {errors.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-semibold mb-2">
                設定に問題があります
              </p>
              <ul className="space-y-1">
                {errors.map((error, idx) => (
                  <li key={idx} className="text-sm text-red-700">
                    • {error}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {isValid && errors.length === 0 && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-800 font-medium">設定は有効です ✓</p>
        </div>
      )}
    </div>
  );
}
