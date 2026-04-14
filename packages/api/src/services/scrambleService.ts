import { SetScrambleSIRequest, MixedScrambleSI } from '@ryder-cup/shared';
import * as scrambleRepository from '../repositories/mixedScrambleRepository';
import * as eventRepository from '../repositories/eventRepository';

export const setMixedScrambleSI = async (eventId: string, input: SetScrambleSIRequest): Promise<void> => {
    // 1. Verify Event exists
    const event = await eventRepository.getEventById(eventId);
    if (!event) throw new Error('Event not found');

    if (event.status === 'live' || event.status === 'completed') {
        throw new Error('Cannot change scramble stroke indexes for live or completed event');
    }

    // 2. Validate Input
    if (!input.indexes || input.indexes.length !== 18) {
        throw new Error('Must provide stroke indexes for exactly 18 holes');
    }

    const holeNumbers = new Set<number>();
    const indexes = new Set<number>();

    for (const item of input.indexes) {
        if (item.holeNumber < 1 || item.holeNumber > 18) {
            throw new Error(`Invalid hole number: ${item.holeNumber}`);
        }
        if (item.strokeIndex < 1 || item.strokeIndex > 18) {
            throw new Error(`Invalid stroke index: ${item.strokeIndex}`);
        }
        if (holeNumbers.has(item.holeNumber)) {
            throw new Error(`Duplicate hole number: ${item.holeNumber}`);
        }
        if (indexes.has(item.strokeIndex)) {
            throw new Error(`Duplicate stroke index: ${item.strokeIndex}`);
        }
        holeNumbers.add(item.holeNumber);
        indexes.add(item.strokeIndex);
    }

    // 3. Save
    await scrambleRepository.setScrambleSIBatch(eventId, input.indexes);
};

export const getMixedScrambleSI = async (eventId: string): Promise<MixedScrambleSI[]> => {
    return scrambleRepository.getScrambleSI(eventId);
};
