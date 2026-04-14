import { FastifyInstance } from 'fastify';
import * as eventService from '../services/eventService';
import { authenticate } from '../middleware/auth';
import { isOrganizer } from '../repositories/eventMemberRepository';
import { CreateEventRequest, UpdateEventRequest, Event } from '@ryder-cup/shared';

export const eventRoutes = async (fastify: FastifyInstance) => {

    // Create Event (Protected)
    fastify.post<{ Body: CreateEventRequest; Reply: Event | { error: string } }>(
        '/events',
        { onRequest: [authenticate] },
        async (request, reply) => {
            const { name, startDate, endDate, format } = request.body;
            if (!name || !startDate || !endDate || !format) {
                return reply.status(400).send({ error: 'Missing required fields' });
            }

            const user = request.user as { userId: string };

            try {
                const event = await eventService.createEvent(request.body, user.userId);
                return reply.status(201).send(event);
            } catch (err: any) {
                return reply.status(400).send({ error: err.message });
            }
        }
    );

    // Get All Events (Public?) - Prompt implies Organizer creates, maybe Public reads?
    // Let's make it protected for now based on context, or public if needed.
    // Usually events are viewable by players. Let's assume Public Read, Protected Write.
    fastify.get<{ Reply: { events: Event[] } }>(
        '/events',
        async (request, reply) => {
            const events = await eventService.getAllEvents();
            return { events };
        }
    );

    // Join Event By Code
    fastify.post<{ Body: { eventCode: string }; Reply: any }>(
        '/events/join',
        { onRequest: [authenticate] },
        async (request, reply) => {
            const { eventCode } = request.body;
            if (!eventCode) {
                return reply.status(400).send({ error: 'Event code is required' });
            }

            const user = request.user as { userId: string };
            try {
                const result = await eventService.joinEventByCode(eventCode, user.userId);
                return reply.status(201).send(result);
            } catch (err: any) {
                if (err.message === 'Event not found') return reply.status(404).send({ error: err.message });
                if (err.message === 'User already joined this event') return reply.status(409).send({ error: err.message });
                if (err.message === 'Event is closed') return reply.status(400).send({ error: err.message });
                return reply.status(400).send({ error: err.message });
            }
        }
    );

    // Join Event (Legacy/Direct ID)
    fastify.post<{ Params: { id: string }; Reply: any }>(
        '/events/:id/join',
        { onRequest: [authenticate] },
        async (request, reply) => {
            const user = request.user as { userId: string };
            try {
                const member = await eventService.joinEvent(request.params.id, user.userId);
                return reply.status(201).send(member);
            } catch (err: any) {
                if (err.message === 'Event not found') return reply.status(404).send({ error: err.message });
                if (err.message === 'User already joined this event') return reply.status(409).send({ error: err.message });
                return reply.status(400).send({ error: err.message });
            }
        }
    );

    // Get Event Members
    fastify.get<{ Params: { id: string }; Reply: any }>(
        '/events/:id/members',
        async (request, reply) => {
            // In future, check if user is member of event to see roster? 
            // For now, allow any auth user to see roster (public event concept)
            const members = await eventService.getEventMembers(request.params.id);
            return members;
        }
    );

    // Get Single Event
    fastify.get<{ Params: { id: string }; Reply: Event | { error: string } }>(
        '/events/:id',
        async (request, reply) => {
            const event = await eventService.getEventById(request.params.id);
            if (!event) return reply.status(404).send({ error: 'Event not found' });
            return event;
        }
    );

    // Update Event (Protected)
    fastify.put<{ Params: { id: string }; Body: UpdateEventRequest; Reply: Event | { error: string } }>(
        '/events/:id',
        { onRequest: [authenticate] },
        async (request, reply) => {
            try {
                const user = request.user as { userId: string };
                const organizer = await isOrganizer(request.params.id, user.userId);
                if (!organizer) return reply.status(403).send({ error: 'Requires organizer privileges' });

                const event = await eventService.updateEvent(request.params.id, request.body);
                if (!event) return reply.status(404).send({ error: 'Event not found' });
                return event;
            } catch (err: any) {
                return reply.status(400).send({ error: err.message });
            }
        }
    );

    // Delete Event (Protected)
    fastify.delete<{ Params: { id: string }; Reply: { message: string } | { error: string } }>(
        '/events/:id',
        { onRequest: [authenticate] },
        async (request, reply) => {
            const user = request.user as { userId: string };
            const organizer = await isOrganizer(request.params.id, user.userId);
            if (!organizer) return reply.status(403).send({ error: 'Requires organizer privileges' });

            await eventService.deleteEvent(request.params.id);
            return { message: 'Event deleted successfully' };
        }
    );
};
