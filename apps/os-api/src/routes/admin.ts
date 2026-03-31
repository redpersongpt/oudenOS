import type { FastifyInstance } from 'fastify';
import { desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { fleetGroups } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

export default async function adminRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireAdmin);

  app.get('/fleet-groups', async (_request, reply) => {
    const groups = await db
      .select()
      .from(fleetGroups)
      .orderBy(desc(fleetGroups.createdAt));

    return reply.send({
      success: true,
      data: { fleetGroups: groups },
    });
  });
}
