import { CreatePlayerRequest, UpdatePlayerRequest, Player } from '@ryder-cup/shared';
import * as playerRepository from '../repositories/playerRepository';
import * as eventRepository from '../repositories/eventRepository';
import * as courseRepository from '../repositories/courseRepository';

export const addPlayer = async (eventId: string, input: CreatePlayerRequest): Promise<Player> => {
    // 1. Verify Event
    const event = await eventRepository.getEventById(eventId);
    if (!event) throw new Error('Event not found');
    if (event.status === 'completed') throw new Error('Cannot add player to completed event');

    // 2. Validate Tee
    const course = await courseRepository.getCourseByEventId(eventId);
    if (!course) throw new Error('Course not configured for event');
    const teeExists = course.tees.some(t => t.id === input.teeId);
    if (!teeExists) throw new Error('Invalid tee ID for this event');

    // 3. Validate Handicap
    if (input.handicapIndex < -10 || input.handicapIndex > 54) {
        throw new Error('Handicap index must be between -10 and 54');
    }

    return playerRepository.createPlayer(eventId, input);
};

export const getEventPlayers = async (eventId: string): Promise<Player[]> => {
    return playerRepository.getPlayersByEventId(eventId);
};

export const updatePlayer = async (eventId: string, playerId: string, input: UpdatePlayerRequest): Promise<Player> => {
    // Verify player belongs to event
    const player = await playerRepository.getPlayerById(playerId);
    if (!player) throw new Error('Player not found');
    if (player.eventId !== eventId) throw new Error('Player does not belong to this event');

    // Validate Tee if changing
    if (input.teeId) {
        const course = await courseRepository.getCourseByEventId(eventId);
        if (!course || !course.tees.some(t => t.id === input.teeId)) {
            throw new Error('Invalid tee ID');
        }
    }

    const updated = await playerRepository.updatePlayer(playerId, input);
    if (!updated) throw new Error('Failed to update player');
    return updated;
};

export const removePlayer = async (eventId: string, playerId: string): Promise<void> => {
    const player = await playerRepository.getPlayerById(playerId);
    if (!player) throw new Error('Player not found');
    if (player.eventId !== eventId) throw new Error('Player mismatch');

    await playerRepository.deletePlayer(playerId);
};
