import { SetOverrideRequest, EffectiveHole } from '@ryder-cup/shared';
import * as overrideRepository from '../repositories/overrideRepository';
import * as eventRepository from '../repositories/eventRepository';
import * as courseRepository from '../repositories/courseRepository';

export const setEventStrokeIndexes = async (eventId: string, input: SetOverrideRequest): Promise<void> => {
    // 1. Verify Event exists
    const event = await eventRepository.getEventById(eventId);
    if (!event) throw new Error('Event not found');

    if (event.status === 'live' || event.status === 'completed') {
        throw new Error('Cannot change stroke indexes for live or completed event');
    }

    // 2. Validate Input
    if (!input.overrides || input.overrides.length !== 18) {
        throw new Error('Must provide overrides for exactly 18 holes');
    }

    const holeIds = new Set<string>();
    const indexes = new Set<number>();

    for (const o of input.overrides) {
        if (indexes.has(o.strokeIndex)) {
            throw new Error(`Duplicate stroke index: ${o.strokeIndex}`);
        }
        if (o.strokeIndex < 1 || o.strokeIndex > 18) {
            throw new Error(`Invalid stroke index: ${o.strokeIndex}`);
        }
        if (holeIds.has(o.holeId)) {
            throw new Error(`Duplicate hole ID: ${o.holeId}`);
        }
        holeIds.add(o.holeId);
        indexes.add(o.strokeIndex);
    }

    // 3. Verify Course/Tee context (Optional but strictly safer)
    // We assume the holeIds belong to a tee associated with this event.
    // Repo FK constraint will fail if holeId invalid, but service check is friendlier.

    // 4. Save
    await overrideRepository.setOverridesBatch(eventId, input.overrides);
};

export const getEffectiveHoles = async (eventId: string, teeId: string): Promise<EffectiveHole[]> => {
    // 1. Get Course/Tee Holes
    const course = await courseRepository.getCourseByEventId(eventId);
    if (!course) throw new Error('Course not found for event');

    const tee = course.tees.find(t => t.id === teeId);
    if (!tee) throw new Error('Tee not found');

    // 2. Get Overrides
    const overrides = await overrideRepository.getOverridesForEvent(eventId);
    const overridesMap = new Map(overrides.map(o => [o.holeId, o.newStrokeIndex]));

    // 3. Merge
    return tee.holes.map(h => {
        const overrideSI = overridesMap.get(h.id!);
        return {
            ...h,
            originalStrokeIndex: h.strokeIndex,
            strokeIndex: overrideSI !== undefined ? overrideSI : h.strokeIndex,
            isOverridden: overrideSI !== undefined
        };
    });
};
