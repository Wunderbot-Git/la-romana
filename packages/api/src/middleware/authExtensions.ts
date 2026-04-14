import { FastifyReply, FastifyRequest } from 'fastify';
import { isOrganizer } from '../repositories/eventMemberRepository';
import { getPlayerByUserId } from '../repositories/playerRepository';

// Middleware to ensure user is an organizer
export const requireOrganizer = async (request: FastifyRequest<{ Params: { eventId: string } }>, reply: FastifyReply) => {
    const { eventId } = request.params;
    const user = request.user as { userId: string };

    const organizer = await isOrganizer(eventId, user.userId);
    if (!organizer) {
        reply.status(403).send({ error: 'Requires organizer privileges' });
        // In Fastify hooks/preHandler, sending reply stops chain but we should return
        return;
    }
};

// Middleware to ensure user is EITHER:
// 1. An Organizer
// 2. A Player assigned to the SPECIFIC flight requested
export const requireFlightAccess = async (request: FastifyRequest<{ Params: { eventId: string; flightId: string } }>, reply: FastifyReply) => {
    const { eventId, flightId } = request.params;
    const user = request.user as { userId: string };

    // 1. Check Organizer
    const organizer = await isOrganizer(eventId, user.userId);
    if (organizer) return; // Pass

    // 2. Check Player Logic
    const player = await getPlayerByUserId(eventId, user.userId);
    if (!player) {
        reply.status(403).send({ error: 'Not a participant in this event' });
        return;
    }

    if (player.flightId !== flightId) {
        reply.status(403).send({ error: 'Access denied: You are not a member of this flight' });
        return;
    }

    // Pass
};
