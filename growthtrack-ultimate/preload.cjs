'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Intentionally minimal. New desktop capabilities must be explicitly
// allowlisted here instead of exposing Node or Electron to the renderer.
contextBridge.exposeInMainWorld('growthTrackDesktop', Object.freeze({
  platform: process.platform,
  desktop: true,
  systemSummary: () => ipcRenderer.invoke('growthtrack:system-summary'),
  openCompanion: () => ipcRenderer.invoke('growthtrack:open-companion'),
  closeCompanion: () => ipcRenderer.invoke('growthtrack:close-companion'),
  openFeature: feature => ipcRenderer.invoke('growthtrack:open-feature', feature),
  onOpenFeature: callback => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, feature) => { if (['notes', 'calendar', 'current', 'ai'].includes(feature)) callback(feature); };
    ipcRenderer.on('growthtrack:open-feature', listener);
    return () => ipcRenderer.removeListener('growthtrack:open-feature', listener);
  },
  provisionOwner: input => ipcRenderer.invoke('growthtrack:provision-owner', input),
}));
