# Electron Security Rules

When modifying Electron code (main process, preload, or renderer):

- NEVER enable `nodeIntegration` in any BrowserWindow
- NEVER disable `contextIsolation` or `sandbox`
- NEVER expose raw `ipcRenderer` to renderer — always go through contextBridge
- ALL new IPC channels must be added to the preload API type (`RedcoreAPI`) and the IPC contract (`shared-schema/src/ipc.ts`)
- Validate IPC channel names against an allowlist — never forward arbitrary channel strings
- CSP headers are set in main process — do not weaken them without explicit approval
- No `shell.openExternal` with user-controlled URLs without URL validation
- No `webview` tags — use BrowserView if embedding external content is ever needed
- Preload script must be the ONLY bridge between Node.js and renderer worlds
