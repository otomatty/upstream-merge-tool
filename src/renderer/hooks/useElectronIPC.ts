import { useEffect, useCallback } from 'react';
import type { ProgressEvent } from '@shared/types/ipc';

export function useElectronIPC() {
  // Preload スクリプトで exposed したオブジェクトにアクセス
  const api = (window as any).electronAPI;

  if (!api) {
    throw new Error('Electron IPC API not available');
  }

  return api;
}

export function useGitProgress(onProgress: (event: ProgressEvent) => void) {
  const api = useElectronIPC();

  useEffect(() => {
    api.git.onProgress(onProgress);
  }, [api, onProgress]);
}

export function useMergeWorkflow() {
  const api = useElectronIPC();

  const startMerge = useCallback(async (remote: string, branch: string) => {
    return await api.git.merge(remote, branch);
  }, [api]);

  const getConflicts = useCallback(async () => {
    return await api.conflict.list();
  }, [api]);

  const resolveConflict = useCallback(
    async (fileId: string, strategy: 'upstream' | 'local' | 'both') => {
      return await api.conflict.resolve(fileId, strategy);
    },
    [api]
  );

  const stageFiles = useCallback(async (files: string[]) => {
    return await api.git.add(files);
  }, [api]);

  return {
    startMerge,
    getConflicts,
    resolveConflict,
    stageFiles,
  };
}
