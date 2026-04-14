import { FastifyRequest, FastifyReply } from 'fastify';

export const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        await request.jwtVerify();
    } catch (err) {
        reply.status(401).send({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
    }
};
