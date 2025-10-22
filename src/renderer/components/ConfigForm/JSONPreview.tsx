import React, { useMemo } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ConfigType } from '@shared/types/ipc';

interface JSONPreviewProps {
  config: ConfigType;
  className?: string;
}

export default function JSONPreview({ config, className = '' }: JSONPreviewProps) {
  const [copied, setCopied] = React.useState(false);

  // Format JSON for display
  const jsonString = useMemo(() => {
    try {
      return JSON.stringify(config, null, 2);
    } catch {
      return '{}';
    }
  }, [config]);

  // Handle copy to clipboard
  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [jsonString]);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="font-semibold text-gray-100">設定プレビュー (JSON)</span>
        </div>
        <Button
          onClick={handleCopy}
          size="sm"
          variant="ghost"
          title="JSONをコピー"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-1" />
              <span className="text-xs">コピー完了</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-1" />
              <span className="text-xs">コピー</span>
            </>
          )}
        </Button>
      </div>

      <pre className="font-mono text-sm text-gray-700 bg-gray-50 p-4 rounded overflow-x-auto">
        <code>{jsonString}</code>
      </pre>
    </div>
  );
}
