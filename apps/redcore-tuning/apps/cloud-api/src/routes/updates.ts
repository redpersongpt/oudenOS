import type { FastifyPluginAsync } from "fastify";

export const updateRoutes: FastifyPluginAsync = async (app) => {
  // Check for desktop app updates
  app.get("/check", async (_request, _reply) => {
    // TODO: Return latest version info, download URL, changelog
    return {
      currentVersion: "0.1.0",
      latestVersion: "0.1.0",
      updateAvailable: false,
      downloadUrl: null,
      changelog: null,
      mandatory: false,
    };
  });

  // Get app catalog manifest (for App Hub)
  app.get("/catalog", async (_request, _reply) => {
    // TODO: Return curated app catalog with checksums
    return { apps: [], lastUpdated: new Date().toISOString() };
  });
};
