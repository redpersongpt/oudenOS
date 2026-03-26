import type {
  FastifyRequest,
  FastifyReply,
  preHandlerHookHandler,
} from 'fastify';

export const requireAdmin: preHandlerHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  if (request.userRole !== 'admin') {
    return reply.status(403).send({
      success: false,
      error: { code: 'ADMIN_001', message: 'Admin access required' },
    });
  }
  request.adminId = request.userId;
};
