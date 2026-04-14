// CORS Plugin - Cross-Origin Resource Sharing configuration

import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

async function corsPlugin(fastify: FastifyInstance) {
    // Add CORS headers
    fastify.addHook('onRequest', async (request, reply) => {
        const origin = request.headers.origin || '*';

        reply.header('Access-Control-Allow-Origin', origin);
        reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        reply.header('Access-Control-Allow-Credentials', 'true');
        reply.header('Access-Control-Max-Age', '86400');

        // Handle preflight
        if (request.method === 'OPTIONS') {
            return reply.status(204).send();
        }
    });
}

export default fp(corsPlugin, {
    name: 'cors'
});
