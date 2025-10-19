import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import ConfigForm from '../components/ConfigForm';
import type { ConfigType } from '@shared/types/ipc';

interface ConfigPageProps {
  onNext: () => void;
}

export default function ConfigPage({ onNext }: ConfigPageProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async (config: ConfigType) => {
    try {
      setIsLoading(true);
      // ConfigForm 内で既に IPC 呼び出しを行っているため、
      // ここでは追加の処理は不要
      console.log('Config saved:', config);
    } catch (error) {
      console.error('Save error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidate = async (config: Partial<ConfigType>) => {
    try {
      const result = await (window as any).electronAPI.config.validate(config);
      return result;
    } catch (error) {
      console.error('Validation error:', error);
      return { isValid: false, errors: ['Validation failed'] };
    }
  };

  const handleNext = () => {
    onNext();
    navigate('/merge');
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">設定ファイルの読み込み</h1>
        <p className="text-gray-600">
          マージツールの設定ファイルを選択して、内容を確認・編集します。
        </p>
      </div>

      <ConfigForm 
        onSave={handleSave}
        onValidate={handleValidate}
        onNext={handleNext}
      />
    </div>
  );
}

