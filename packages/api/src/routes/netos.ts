import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import { isOrganizer } from '../repositories/eventMemberRepository';
import * as netoRepo from '../repositories/netoPotRepository';
import {
    CreateNetoPotRequest,
    SetNetoWinnersRequest,
    NetoPot,
    NetoPotWinner,
} from '@ryder-cup/shared';

export const netoRoutes = async (fastify: FastifyInstance) => {

    // List pots for a round — public (spectators see pot status)
    fastify.get<{ Params: { eventId: string; roundId: string }; Reply: NetoPot[] | { error: string } }>(
        '/events/:eventId/rounds/:roundId/neto-pots',
        async (request, reply) => {
            try {
                return await netoRepo.listPotsForRound(request.params.roundId);
            } catch (err: any) {
                return reply.status(500).send({ error: err.message });
            }
        }
    );

    // Create/update pot — organizer only
    fastify.post<{ Params: { eventId: string; roundId: string }; Body: CreateNetoPotRequest; Reply: NetoPot | { error: string } }>(
        '/events/:eventId/rounds/:roundId/neto-pots',
        { onRequest: [authenticate] },
        async (request, reply) => {
            const user = request.user as { userId: string };
            const { eventId, roundId } = request.params;

            const organizer = await isOrganizer(eventId, user.userId);
            if (!organizer) {
                return reply.status(403).send({ error: 'Only organizers can manage neto pots' });
            }

            const { flightId, potAmountUsd } = request.body;
            if (!flightId || potAmountUsd === undefined || potAmountUsd < 0) {
                return reply.status(400).send({ error: 'flightId and non-negative potAmountUsd required' });
            }

            try {
                const pot = await netoRepo.createPot({ roundId, flightId, potAmountUsd });
                return reply.status(201).send(pot);
            } catch (err: any) {
                return reply.status(400).send({ error: err.message });
            }
        }
    );

    // Set winners for a pot — organizer only
    fastify.put<{
        Params: { eventId: string; roundId: string; potId: string };
        Body: SetNetoWinnersRequest;
        Reply: NetoPotWinner[] | { error: string };
    }>(
        '/events/:eventId/rounds/:roundId/neto-pots/:potId/winners',
        { onRequest: [authenticate] },
        async (request, reply) => {
            const user = request.user as { userId: string };
            const { eventId, potId } = request.params;

            const organizer = await isOrganizer(eventId, user.userId);
            if (!organizer) {
                return reply.status(403).send({ error: 'Only organizers can set neto winners' });
            }

            const { winners } = request.body;
            if (!Array.isArray(winners) || winners.length === 0 || winners.length > 2) {
                return reply.status(400).send({ error: 'winners must be a non-empty array of up to 2 entries' });
            }
            for (const w of winners) {
                if (!w.playerId || ![1, 2].includes(w.rank)) {
                    return reply.status(400).send({ error: 'each winner must have playerId and rank 1 or 2' });
                }
            }

            try {
                return await netoRepo.setPotWinners(potId, winners);
            } catch (err: any) {
                return reply.status(400).send({ error: err.message });
            }
        }
    );
};
