import { contextBridge, ipcRenderer } from 'electron';
import type { ConfigType, ConflictFile, MergeResult, ReportSummary, ProgressEvent } from '@shared/types/ipc';

// IPC 型定義
type ElectronAPI = {
  config: {
    load: (configPath: string) => Promise<ConfigType>;
    save: (configPath: string, config: ConfigType) => Promise<void>;
    validate: (config: Partial<ConfigType>) => Promise<{ isValid: boolean; errors: string[] }>;
  };
  git: {
    fetch: (remote: string) => Promise<void>;
    merge: (remote: string, branch: string) => Promise<MergeResult>;
    status: () => Promise<string>;
    add: (files: string[]) => Promise<void>;
    commit: (message: string) => Promise<void>;
    onProgress: (callback: (data: ProgressEvent) => void) => void;
  };
  conflict: {
    list: () => Promise<ConflictFile[]>;
    getDiff: (filePath: string) => Promise<any>;
    resolve: (fileId: string, strategy: 'upstream' | 'local' | 'both') => Promise<void>;
  };
  report: {
    getSummary: () => Promise<ReportSummary>;
    getDetails: () => Promise<string>;
  };
};

const electronAPI: ElectronAPI = {
  config: {
    load: (configPath) => ipcRenderer.invoke('config:load', configPath),
    save: (configPath, config) => ipcRenderer.invoke('config:save', configPath, config),
    validate: (config) => ipcRenderer.invoke('config:validate', config),
  },
  git: {
    fetch: (remote) => ipcRenderer.invoke('git:fetch', remote),
    merge: (remote, branch) => ipcRenderer.invoke('git:merge', remote, branch),
    status: () => ipcRenderer.invoke('git:status'),
    add: (files) => ipcRenderer.invoke('git:add', files),
    commit: (message) => ipcRenderer.invoke('git:commit', message),
    onProgress: (callback) => {
      ipcRenderer.on('git:progress', (_event, data) => callback(data));
    },
  },
  conflict: {
    list: () => ipcRenderer.invoke('conflict:list'),
    getDiff: (filePath) => ipcRenderer.invoke('conflict:getDiff', filePath),
    resolve: (fileId, strategy) => ipcRenderer.invoke('conflict:resolve', fileId, strategy),
  },
  report: {
    getSummary: () => ipcRenderer.invoke('report:getSummary'),
    getDetails: () => ipcRenderer.invoke('report:getDetails'),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
