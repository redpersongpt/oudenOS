"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// apps/desktop/src/preload/index.ts
var index_exports = {};
module.exports = __toCommonJS(index_exports);
var import_electron = require("electron");
var ALLOWED_METHODS = /* @__PURE__ */ new Set([
  // Scan
  "scan.hardware",
  "scan.quick",
  "scan.cpuPower",
  "scan.scheduler",
  "scan.serviceStates",
  "scan.filesystem",
  "scan.memMgmt",
  // Tuning
  "tuning.generatePlan",
  "tuning.getActions",
  "tuning.previewAction",
  "tuning.applyPlan",
  "tuning.applyAction",
  "tuning.skipAction",
  // Benchmark
  "benchmark.run",
  "benchmark.list",
  "benchmark.compare",
  "benchmark.analyzeBottlenecks",
  // Rollback
  "rollback.listSnapshots",
  "rollback.createSnapshot",
  "rollback.restore",
  "rollback.getDiff",
  "rollback.getAuditLog",
  "rollback.restoreActions",
  // Journal
  "journal.getState",
  "journal.resume",
  "journal.cancel",
  // License (service-side)
  "license.getState",
  "license.activate",
  "license.deactivate",
  "license.refresh",
  // App hub
  "apphub.getCatalog",
  "apphub.install",
  "apphub.checkUpdates",
  // System
  "system.requestReboot",
  "system.getServiceStatus",
  // Machine Intelligence
  "intelligence.classify",
  "intelligence.getProfile",
  "intelligence.getRecommendations"
]);
var ALLOWED_EVENTS = /* @__PURE__ */ new Set([
  "service:license.changed",
  "service:service.error"
]);
var api = {
  window: {
    minimize: () => import_electron.ipcRenderer.send("window:minimize"),
    maximize: () => import_electron.ipcRenderer.send("window:maximize"),
    close: () => import_electron.ipcRenderer.send("window:close")
  },
  service: {
    call: async (method, params) => {
      if (!ALLOWED_METHODS.has(method)) {
        throw new Error(`Blocked IPC call to unknown method: ${method}`);
      }
      return import_electron.ipcRenderer.invoke("service:call", method, params);
    }
  },
  shell: {
    openExternal: (url) => {
      if (url.startsWith("https://")) {
        import_electron.shell.openExternal(url);
      }
    }
  },
  license: {
    get: () => import_electron.ipcRenderer.invoke("license:get"),
    refresh: () => import_electron.ipcRenderer.invoke("license:refresh")
  },
  on: (channel, callback) => {
    if (!ALLOWED_EVENTS.has(channel)) {
      console.warn(`Blocked subscription to unknown event channel: ${channel}`);
      return () => {
      };
    }
    const handler = (_event, ...args) => callback(...args);
    import_electron.ipcRenderer.on(channel, handler);
    return () => import_electron.ipcRenderer.removeListener(channel, handler);
  },
  platform: process.platform
};
import_electron.contextBridge.exposeInMainWorld("redcore", api);
