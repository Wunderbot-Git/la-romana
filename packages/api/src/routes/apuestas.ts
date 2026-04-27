import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getApuestasOverview } from '../services/apuestasService';

export const apuestasRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
    fastify.get<{ Params: { eventId: string } }>(
        '/events/:eventId/apuestas',
        async (request, reply) => {
            try {
                const overview = await getApuestasOverview(request.params.eventId);
                return reply.send(overview);
            } catch (err: any) {
                return reply.status(500).send({ error: err.message });
            }
        },
    );
};

export default apuestasRoutes;
