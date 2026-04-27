import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import { isOrganizer } from '../repositories/eventMemberRepository';
import * as roundService from '../services/roundService';
import * as courseRepo from '../repositories/courseRepository';
import * as playerRoundTeeRepo from '../repositories/playerRoundTeeRepository';
import { invalidateLeaderboardCache } from '../services/leaderboardService';
import { getPool } from '../config/database';
import { computePlayingHandicapFromIndex } from '../scoring/handicap';
import { CreateRoundRequest, UpdateRoundRequest, Round, PlayingHandicap } from '@ryder-cup/shared';

export const roundRoutes = async (fastify: FastifyInstance) => {

    // List rounds for an event — public (spectators need round info)
    fastify.get<{ Params: { eventId: string }; Reply: Round[] | { error: string } }>(
        '/events/:eventId/rounds',
        async (request, reply) => {
            try {
                return await roundService.listRounds(request.params.eventId);
            } catch (err: any) {
                return reply.status(500).send({ error: err.message });
            }
        }
    );

    // Get a single round by id — public
    fastify.get<{ Params: { eventId: string; roundId: string }; Reply: Round | { error: string } }>(
        '/events/:eventId/rounds/:roundId',
        async (request, reply) => {
            const round = await roundService.getRound(request.params.roundId);
            if (!round || round.eventId !== request.params.eventId) {
                return reply.status(404).send({ error: 'Round not found' });
            }
            return round;
        }
    );

    // Create round — organizer only
    fastify.post<{ Params: { eventId: string }; Body: CreateRoundRequest; Reply: Round | { error: string } }>(
        '/events/:eventId/rounds',
        { onRequest: [authenticate] },
        async (request, reply) => {
            const user = request.user as { userId: string };
            const { eventId } = request.params;

            const organizer = await isOrganizer(eventId, user.userId);
            if (!organizer) {
                return reply.status(403).send({ error: 'Only organizers can create rounds' });
            }

            try {
                const round = await roundService.createRound(eventId, request.body);
                return reply.status(201).send(round);
            } catch (err: any) {
                if (err.message === 'Course not found for this event') {
                    return reply.status(404).send({ error: err.message });
                }
                return reply.status(400).send({ error: err.message });
            }
        }
    );

    // Update round — organizer only
    fastify.patch<{ Params: { eventId: string; roundId: string }; Body: UpdateRoundRequest; Reply: Round | { error: string } }>(
        '/events/:eventId/rounds/:roundId',
        { onRequest: [authenticate] },
        async (request, reply) => {
            const user = request.user as { userId: string };
            const { eventId, roundId } = request.params;

            const organizer = await isOrganizer(eventId, user.userId);
            if (!organizer) {
                return reply.status(403).send({ error: 'Only organizers can update rounds' });
            }

            try {
                const updated = await roundService.updateRound(roundId, request.body);
                // Allowance / state / scheduling changes can affect leaderboard PH and visibility,
                // so invalidate the cached snapshot.
                invalidateLeaderboardCache(eventId);
                return updated;
            } catch (err: any) {
                if (err.message === 'Round not found') {
                    return reply.status(404).send({ error: err.message });
                }
                return reply.status(400).send({ error: err.message });
            }
        }
    );

    // Delete round — organizer only
    fastify.delete<{ Params: { eventId: string; roundId: string }; Reply: { message: string } | { error: string } }>(
        '/events/:eventId/rounds/:roundId',
        { onRequest: [authenticate] },
        async (request, reply) => {
            const user = request.user as { userId: string };
            const { eventId, roundId } = request.params;

            const organizer = await isOrganizer(eventId, user.userId);
            if (!organizer) {
                return reply.status(403).send({ error: 'Only organizers can delete rounds' });
            }

            try {
                await roundService.deleteRound(roundId);
                return reply.send({ message: 'Round deleted' });
            } catch (err: any) {
                if (err.message === 'Round not found') {
                    return reply.status(404).send({ error: err.message });
                }
                return reply.status(500).send({ error: err.message });
            }
        }
    );

    // Per-round Playing Handicap snapshot for every player in the event.
    // Used by the Admin "Compose Flights" UI to show "PH: 7" next to each player slot.
    // Computes USGA Course HCP × singles-allowance and × fourball-allowance separately.
    // Falls back to legacy `index × allowance` if the player's tee has no slope/rating yet.
    fastify.get<{
        Params: { eventId: string; roundId: string };
        Reply: PlayingHandicap[] | { error: string };
    }>(
        '/events/:eventId/rounds/:roundId/playing-handicaps',
        { onRequest: [authenticate] },
        async (request, reply) => {
            const { eventId, roundId } = request.params;
            const user = request.user as { userId: string };
            if (!(await isOrganizer(eventId, user.userId))) {
                return reply.status(403).send({ error: 'Only organizers can view playing handicaps' });
            }

            const pool = getPool();
            // Load round (for course id + allowances)
            const roundRes = await pool.query(
                `SELECT id, course_id, hcp_singles_pct, hcp_fourball_pct
                   FROM rounds WHERE id = $1 AND event_id = $2`,
                [roundId, eventId]
            );
            if (roundRes.rowCount === 0) return reply.status(404).send({ error: 'Round not found' });
            const round = roundRes.rows[0];
            const allowanceSingles = Number(round.hcp_singles_pct);
            const allowanceFourball = Number(round.hcp_fourball_pct);

            // Load all tees for this course with their pre-computed par totals
            const teesRes = await pool.query(
                `SELECT t.id, t.name, t.slope_rating, t.course_rating,
                        COALESCE(SUM(h.par), 0) AS par_total
                   FROM tees t
                   LEFT JOIN holes h ON h.tee_id = t.id
                  WHERE t.course_id = $1
                  GROUP BY t.id`,
                [round.course_id]
            );
            const teeById = new Map<string, { name: string; slope: number | null; rating: number | null; par: number | null }>();
            for (const t of teesRes.rows) {
                const par = Number(t.par_total) || null;
                teeById.set(t.id, {
                    name: t.name,
                    slope: t.slope_rating != null ? Number(t.slope_rating) : null,
                    rating: t.course_rating != null ? Number(t.course_rating) : null,
                    par: par && par > 0 ? par : null,
                });
            }

            // Per-round tee overrides (migration 026): map<playerId, teeId>
            const overrideRes = await pool.query(
                `SELECT player_id, tee_id FROM player_round_tees WHERE round_id = $1`,
                [roundId]
            );
            const teeOverride = new Map<string, string>();
            for (const r of overrideRes.rows) teeOverride.set(r.player_id, r.tee_id);

            // Load roster
            const playersRes = await pool.query(
                `SELECT id, first_name, last_name, handicap_index, tee_id
                   FROM players
                  WHERE event_id = $1
                  ORDER BY first_name ASC`,
                [eventId]
            );

            const out: PlayingHandicap[] = playersRes.rows.map((p: any) => {
                const effectiveTeeId = teeOverride.get(p.id) ?? p.tee_id;
                const tee = effectiveTeeId ? teeById.get(effectiveTeeId) ?? null : null;
                const idx = Number(p.handicap_index) || 0;
                const phSingles = computePlayingHandicapFromIndex({
                    handicapIndex: idx,
                    slope: tee?.slope ?? null,
                    rating: tee?.rating ?? null,
                    par: tee?.par ?? null,
                    allowance: allowanceSingles,
                });
                const phFourball = computePlayingHandicapFromIndex({
                    handicapIndex: idx,
                    slope: tee?.slope ?? null,
                    rating: tee?.rating ?? null,
                    par: tee?.par ?? null,
                    allowance: allowanceFourball,
                });
                return {
                    playerId: p.id,
                    playerName: [p.first_name, p.last_name].filter((n: string) => n && n !== '-').join(' ').trim() || 'Unknown',
                    handicapIndex: idx,
                    teeId: effectiveTeeId ?? null,
                    teeName: tee?.name ?? null,
                    coursePar: tee?.par ?? null,
                    slopeRating: tee?.slope ?? null,
                    courseRating: tee?.rating ?? null,
                    courseHandicap: phSingles.courseHandicap,
                    playingHcpSingles: phSingles.playingHandicap,
                    playingHcpFourball: phFourball.playingHandicap,
                };
            });

            return out;
        }
    );

    // Set per-round tee override for a player (Organizer Only).
    // Body: { teeId } — pass null to clear and revert to legacy `players.tee_id`.
    fastify.put<{
        Params: { eventId: string; roundId: string; playerId: string };
        Body: { teeId: string | null };
        Reply: { teeId: string | null } | { error: string };
    }>(
        '/events/:eventId/rounds/:roundId/players/:playerId/tee',
        { onRequest: [authenticate] },
        async (request, reply) => {
            const { eventId, roundId, playerId } = request.params;
            const user = request.user as { userId: string };
            if (!(await isOrganizer(eventId, user.userId))) {
                return reply.status(403).send({ error: 'Only organizers can set tee overrides' });
            }
            const { teeId } = request.body;
            try {
                if (teeId == null) {
                    await playerRoundTeeRepo.clearPlayerRoundTee(playerId, roundId);
                    invalidateLeaderboardCache(eventId);
                    return { teeId: null };
                }
                // Validate tee belongs to the round's course
                const pool = getPool();
                const validate = await pool.query(
                    `SELECT t.id FROM tees t
                       JOIN rounds r ON r.course_id = t.course_id
                      WHERE t.id = $1 AND r.id = $2 AND r.event_id = $3`,
                    [teeId, roundId, eventId]
                );
                if (validate.rowCount === 0) {
                    return reply.status(400).send({ error: 'Tee does not belong to this round\'s course' });
                }
                const result = await playerRoundTeeRepo.setPlayerRoundTee(playerId, roundId, teeId);
                invalidateLeaderboardCache(eventId);
                return { teeId: result.teeId };
            } catch (err: any) {
                return reply.status(400).send({ error: err.message });
            }
        }
    );
};
