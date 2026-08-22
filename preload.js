const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld(
  'db', {
    getState: () => ipcRenderer.invoke('db:getState'),
    saveState: (stateJSON) => ipcRenderer.invoke('db:saveState', stateJSON),
  }
);
contextBridge.exposeInMainWorld(
  'electron', {
    getBackupData: () => ipcRenderer.invoke('get-backup-data'),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    reload: () => ipcRenderer.invoke('app:reload')
  }
);

// Expose APIs directly to window to match index.tsx usage
contextBridge.exposeInMainWorld('getAppVersion', () => ipcRenderer.invoke('get-app-version'));
contextBridge.exposeInMainWorld('checkForUpdates', () => ipcRenderer.invoke('check-for-updates'));
contextBridge.exposeInMainWorld('onDownloadProgress', (callback) => ipcRenderer.on('download-progress', (event, value) => callback(value)));