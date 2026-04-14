import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import { isOrganizer } from '../repositories/eventMemberRepository';
import * as sidePotRepo from '../repositories/sidePotRepository';
import {
    CreateSidePotRequest,
    SetSidePotWinnerRequest,
    SidePot,
} from '@ryder-cup/shared';

const isValidType = (t: string): boolean => t === 'longest_drive' || t === 'closest_to_pin';

export const sidePotRoutes = async (fastify: FastifyInstance) => {

    // List side pots for a round — public
    fastify.get<{ Params: { eventId: string; roundId: string }; Reply: SidePot[] | { error: string } }>(
        '/events/:eventId/rounds/:roundId/side-pots',
        async (request, reply) => {
            try {
                return await sidePotRepo.listSidePotsForRound(request.params.roundId);
            } catch (err: any) {
                return reply.status(500).send({ error: err.message });
            }
        }
    );

    // Create side pot — organizer only
    fastify.post<{ Params: { eventId: string; roundId: string }; Body: CreateSidePotRequest; Reply: SidePot | { error: string } }>(
        '/events/:eventId/rounds/:roundId/side-pots',
        { onRequest: [authenticate] },
        async (request, reply) => {
            const user = request.user as { userId: string };
            const { eventId, roundId } = request.params;

            const organizer = await isOrganizer(eventId, user.userId);
            if (!organizer) {
                return reply.status(403).send({ error: 'Only organizers can create side pots' });
            }

            const { type, holeNumber } = request.body;
            if (!isValidType(type)) {
                return reply.status(400).send({ error: "type must be 'longest_drive' or 'closest_to_pin'" });
            }
            if (!Number.isInteger(holeNumber) || holeNumber < 1 || holeNumber > 18) {
                return reply.status(400).send({ error: 'holeNumber must be 1..18' });
            }

            try {
                const pot = await sidePotRepo.createSidePot({ roundId, type, holeNumber });
                return reply.status(201).send(pot);
            } catch (err: any) {
                return reply.status(400).send({ error: err.message });
            }
        }
    );

    // Set winner — organizer only
    fastify.patch<{
        Params: { eventId: string; roundId: string; potId: string };
        Body: SetSidePotWinnerRequest;
        Reply: SidePot | { error: string };
    }>(
        '/events/:eventId/rounds/:roundId/side-pots/:potId',
        { onRequest: [authenticate] },
        async (request, reply) => {
            const user = request.user as { userId: string };
            const { eventId, potId } = request.params;

            const organizer = await isOrganizer(eventId, user.userId);
            if (!organizer) {
                return reply.status(403).send({ error: 'Only organizers can set side pot winners' });
            }

            try {
                const updated = await sidePotRepo.setSidePotWinner(potId, request.body.winningPlayerId ?? null);
                if (!updated) return reply.status(404).send({ error: 'Side pot not found' });
                return updated;
            } catch (err: any) {
                return reply.status(400).send({ error: err.message });
            }
        }
    );

    // Delete side pot — organizer only
    fastify.delete<{ Params: { eventId: string; roundId: string; potId: string }; Reply: { message: string } | { error: string } }>(
        '/events/:eventId/rounds/:roundId/side-pots/:potId',
        { onRequest: [authenticate] },
        async (request, reply) => {
            const user = request.user as { userId: string };
            const { eventId, potId } = request.params;

            const organizer = await isOrganizer(eventId, user.userId);
            if (!organizer) {
                return reply.status(403).send({ error: 'Only organizers can delete side pots' });
            }

            const deleted = await sidePotRepo.deleteSidePot(potId);
            if (!deleted) return reply.status(404).send({ error: 'Side pot not found' });
            return reply.send({ message: 'Side pot deleted' });
        }
    );
};
