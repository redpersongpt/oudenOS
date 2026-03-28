import type { FastifyPluginAsync } from "fastify";

export const updateRoutes: FastifyPluginAsync = async (app) => {
  // Get app catalog manifest (for App Hub). All account/billing/update metadata
  // now lives in cloud-api; this surface is intentionally narrow.
  app.get("/catalog", async (_request, _reply) => {
    return { apps: [], lastUpdated: new Date().toISOString() };
  });
};
