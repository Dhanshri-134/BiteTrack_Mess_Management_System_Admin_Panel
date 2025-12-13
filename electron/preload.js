const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any specific APIs you want to expose to the renderer process
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  
  // App info
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  
  // Platform info
  getPlatform: () => process.platform,
  
  // File operations (if needed)
  // saveFile: (data) => ipcRenderer.invoke('file:save', data),
  // openFile: () => ipcRenderer.invoke('file:open'),
});