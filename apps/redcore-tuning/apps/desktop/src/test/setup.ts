// Global test setup
// Provides minimal browser API stubs for Zustand persist middleware
if (!window.localStorage) {
  Object.defineProperty(window, "localStorage", {
    value: (() => {
      let store: Record<string, string> = {};
      return {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => { store[k] = v; },
        removeItem: (k: string) => { delete store[k]; },
        clear: () => { store = {}; },
      };
    })(),
  });
}
