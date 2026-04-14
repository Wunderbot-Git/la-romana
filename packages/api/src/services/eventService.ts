import * as eventRepository from '../repositories/eventRepository';
import { Event, CreateEventRequest, UpdateEventRequest } from '@ryder-cup/shared';

// Ideally, basic validation here (dates, enum validity)
// Assuming controller handles basic type checks or schemas

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

    return event;
};

export const getEventById = async (id: string): Promise<Event | null> => {
    return eventRepository.getEventById(id);
};

export const getAllEvents = async (): Promise<Event[]> => {
    return eventRepository.getAllEvents();
};

export const updateEvent = async (id: string, input: UpdateEventRequest): Promise<Event | null> => {
    if (input.startDate && input.endDate) {
        if (new Date(input.startDate) > new Date(input.endDate)) {
            throw new Error('Start date must be before end date');
        }
    }
    return eventRepository.updateEvent(id, input);
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
