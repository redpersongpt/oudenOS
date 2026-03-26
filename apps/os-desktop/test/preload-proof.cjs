// Minimal preload for headed proof — exposes window.redcore API
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("redcore", {
  service: {
    call: (method, params) => ipcRenderer.invoke("service:call", method, params),
  },
  on: (channel, callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
  window: {
    minimize: () => ipcRenderer.send("window:minimize"),
    maximize: () => ipcRenderer.send("window:maximize"),
    close: () => ipcRenderer.send("window:close"),
  },
});
