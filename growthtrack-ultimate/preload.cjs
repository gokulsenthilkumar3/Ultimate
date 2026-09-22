'use strict';

const { contextBridge } = require('electron');

// Intentionally minimal. New desktop capabilities must be explicitly
// allowlisted here instead of exposing Node or Electron to the renderer.
contextBridge.exposeInMainWorld('growthTrackDesktop', Object.freeze({
  platform: process.platform,
  desktop: true,
}));
