import { useMemo } from 'react';
import { Save, Loader } from 'lucide-react';
import UpstreamConfigForm from './UpstreamConfigForm';
import LocalConfigForm from './LocalConfigForm';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type {
  UpstreamConfig,
  LocalConfig,
  CustomCodeConfig,
} from '@shared/types/ipc';

interface PresetConfigSectionProps {
  upstreamConfig: Partial<UpstreamConfig>;
  localConfig: Partial<LocalConfig>;
  codeMarker: CustomCodeConfig['custom_code_marker'];
  upstreamErrors: string[];
  localErrors: string[];
  upstreamValid: boolean;
  localValid: boolean;
  savingPreset: boolean;
  onUpstreamConfigChange: (config: Partial<UpstreamConfig>) => void;
  onLocalConfigChange: (config: Partial<LocalConfig>) => void;
  onCodeMarkerChange: (marker: CustomCodeConfig['custom_code_marker']) => void;
  onUpstreamValidationChange: (isValid: boolean, errors: string[]) => void;
  onLocalValidationChange: (isValid: boolean, errors: string[]) => void;
  onSave: () => void;
}

export default function PresetConfigSection({
  upstreamConfig,
  localConfig,
  codeMarker,
  upstreamErrors,
  localErrors,
  upstreamValid,
  localValid,
  savingPreset,
  onUpstreamConfigChange,
  onLocalConfigChange,
  onCodeMarkerChange,
  onUpstreamValidationChange,
  onLocalValidationChange,
  onSave,
}: PresetConfigSectionProps) {
  // Validate form for save button
  const canSavePreset = useMemo(
    () => upstreamValid && localValid,
    [upstreamValid, localValid],
  );

  return (
    <div className="space-y-8">
      {/* Two Column Cards - Upstream and Local Config */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Upstream Config Card */}
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle>マージ元（Upstream）</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <UpstreamConfigForm
              initialConfig={upstreamConfig as UpstreamConfig}
              onConfigChange={onUpstreamConfigChange}
              onValidationChange={onUpstreamValidationChange}
            />
          </CardContent>
        </Card>

        {/* Local Config Card */}
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle>マージ先（Local）</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <LocalConfigForm
              initialConfig={localConfig as LocalConfig}
              initialCodeMarker={codeMarker}
              onConfigChange={onLocalConfigChange}
              onCodeMarkerChange={onCodeMarkerChange}
              onValidationChange={onLocalValidationChange}
            />
          </CardContent>
        </Card>
      </div>

      {/* Configuration Preview */}
      <Card>
        <CardHeader>
          <CardTitle>設定プレビュー</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-60 w-full rounded border bg-gray-50 p-4">
            <pre className="font-mono text-sm text-gray-700">
              {JSON.stringify(
                {
                  upstream: upstreamConfig,
                  local: localConfig,
                  customCodeMarker: codeMarker,
                },
                null,
                2,
              )}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {(upstreamErrors.length > 0 || localErrors.length > 0) && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-2">
          <p className="font-medium text-red-700">設定に問題があります</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
            {[...upstreamErrors, ...localErrors].map(
              (err, idx) => (
                <li key={idx}>{err}</li>
              ),
            )}
          </ul>
        </div>
      )}

      {/* Save Button */}
      <div className="flex gap-2">
        <Button
          onClick={onSave}
          disabled={!canSavePreset || savingPreset}
          className="flex-1"
          size="lg"
        >
          {savingPreset ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              プリセットを保存
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
