import { CreateCourseRequest, Course } from '@ryder-cup/shared';
import * as courseRepository from '../repositories/courseRepository';
import * as eventRepository from '../repositories/eventRepository';

export const createCourseManually = async (eventId: string, input: CreateCourseRequest): Promise<Course> => {
    // 1. Check if event exists
    const event = await eventRepository.getEventById(eventId);
    if (!event) {
        throw new Error('Event not found');
    }

    // 2. Check if course already exists (Limit 1 per event per schema)
    const existing = await courseRepository.getCourseByEventId(eventId);
    if (existing) {
        throw new Error('Event already has a course assigned');
    }

    // 3. Validation
    if (!input.name || !input.tees || input.tees.length === 0) {
        throw new Error('Course name and at least one tee are required');
    }

    // Validate Tee Rules — allow 9-hole (side events / night golf) or 18-hole tees
    for (const tee of input.tees) {
        if (!tee.name) throw new Error('Tee name is required');

        const holeCount = tee.holes.length;
        if (holeCount !== 18 && holeCount !== 9) {
            throw new Error(`Tee '${tee.name}' must have exactly 9 or 18 holes`);
        }

        const strokeIndexes = new Set<number>();
        for (const hole of tee.holes) {
            if (hole.holeNumber < 1 || hole.holeNumber > holeCount) {
                throw new Error(`Invalid hole number ${hole.holeNumber} in tee '${tee.name}'`);
            }
            if (hole.strokeIndex < 1 || hole.strokeIndex > holeCount) {
                throw new Error(`Invalid stroke index ${hole.strokeIndex} in tee '${tee.name}'`);
            }
            if (strokeIndexes.has(hole.strokeIndex)) {
                throw new Error(`Duplicate stroke index ${hole.strokeIndex} in tee '${tee.name}'`);
            }
            strokeIndexes.add(hole.strokeIndex);
        }
    }

    return courseRepository.createCourse(eventId, input);
};

export const getCourse = async (eventId: string): Promise<Course | null> => {
    return courseRepository.getCourseByEventId(eventId);
};
