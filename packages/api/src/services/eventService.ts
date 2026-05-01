import * as eventRepository from '../repositories/eventRepository';
import { Event, CreateEventRequest, UpdateEventRequest } from '@ryder-cup/shared';

// Ideally, basic validation here (dates, enum validity)
// Assuming controller handles basic type checks or schemas

/**
 * Map a raw Postgres `events` row (snake_case) into the public-facing
 * camelCase shape the web client expects. The repository returns rows
 * untransformed, so callers that surface events to HTTP clients should
 * pipe them through here.
 */
const toPublic = (row: any): Record<string, any> => ({
    id: row.id,
    name: row.name,
    status: row.status,
    eventCode: row.event_code,
    betAmount: row.bet_amount === null || row.bet_amount === undefined ? null : Number(row.bet_amount),
    startDate: row.start_date,
    endDate: row.end_date,
    format: row.format,
    createdAt: row.created_at,
    createdByUserId: row.created_by_user_id,
});

export const createEvent = async (input: CreateEventRequest, userId: string): Promise<Event> => {
    // Validate dates order
    if (new Date(input.startDate) > new Date(input.endDate)) {
        throw new Error('Start date must be before end date');
    }

    // Generate simple event code from name (uppercase, remove spaces, limit 20 chars)
    // Ensure uniqueness handled by DB, potentially retry or add suffix if collision (omitted for simplicity here)
    const eventCode = input.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20) || 'EVENT-' + Date.now();

    const event = await eventRepository.createEvent(input, userId, eventCode);

    // Add creator as organizer
    await import('../repositories/eventMemberRepository').then(repo =>
        repo.addMember(event.id, userId, 'organizer')
    );

    return toPublic(event) as Event;
};

export const getEventById = async (id: string): Promise<Event | null> => {
    const row = await eventRepository.getEventById(id);
    return row ? (toPublic(row) as Event) : null;
};

export const getAllEvents = async (): Promise<Event[]> => {
    const rows = await eventRepository.getAllEvents();
    return rows.map(r => toPublic(r) as Event);
};

export const updateEvent = async (id: string, input: UpdateEventRequest): Promise<Event | null> => {
    if (input.startDate && input.endDate) {
        if (new Date(input.startDate) > new Date(input.endDate)) {
            throw new Error('Start date must be before end date');
        }
    }
    const row = await eventRepository.updateEvent(id, input);
    return row ? (toPublic(row) as Event) : null;
};

// ... imports
import * as memberRepository from '../repositories/eventMemberRepository';
import { EventMember } from '@ryder-cup/shared';

// ... existing code

export const joinEvent = async (eventId: string, userId: string): Promise<EventMember> => {
    const event = await eventRepository.getEventById(eventId);
    if (!event) {
        throw new Error('Event not found');
    }

    const existingMember = await memberRepository.findMember(eventId, userId);
    if (existingMember) {
        throw new Error('User already joined this event');
    }

    return memberRepository.addMember(eventId, userId, 'player');
};

export const joinEventByCode = async (eventCode: string, userId: string): Promise<EventMember & { event: Event }> => {
    const event = await eventRepository.findByCode(eventCode);
    if (!event) {
        throw new Error('Event not found');
    }

    if (event.status === 'closed') {
        throw new Error('Event is closed');
    }

    // Reuse existing join logic validation
    const existingMember = await memberRepository.findMember(event.id, userId);
    if (existingMember) {
        throw new Error('User already joined this event');
    }

    const member = await memberRepository.addMember(event.id, userId, 'player');
    return { ...member, event };
};

export const getEventMembers = async (eventId: string): Promise<EventMember[]> => {
    return memberRepository.listMembers(eventId);
};

export const deleteEvent = async (id: string): Promise<void> => {
    return eventRepository.deleteEvent(id);
};
