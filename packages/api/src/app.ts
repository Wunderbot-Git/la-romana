import Fastify, { FastifyInstance } from 'fastify';
import { config } from './config/env';
import { authRoutes } from './routes/auth';
import { eventRoutes } from './routes/events';
import { courseRoutes } from './routes/courses';
import { overrideRoutes } from './routes/overrides';
import { playerRoutes } from './routes/players';
import { flightRoutes } from './routes/flights';
import scoreRoutes from './routes/scores';
import leaderboardRoutes from './routes/leaderboard';
import spectatorRoutes from './routes/spectator';
import { roundRoutes } from './routes/rounds';
import { netoRoutes } from './routes/netos';
import { sidePotRoutes } from './routes/sidePots';
import { adminRoutes } from './routes/admin';
import { inviteRoutes } from './routes/invites';
import { betRoutes } from './routes/bets';
import { generalBetRoutes } from './routes/generalBets';
import { apuestasRoutes } from './routes/apuestas';
import errorHandler from './plugins/errorHandler';
import cors from './plugins/cors';

export const buildApp = (): FastifyInstance => {
    const app = Fastify({
        logger: config.nodeEnv === 'production'
            ? {
                level: 'info',
                formatters: {
                    level: (label: string, number: number) => {
                        return { severity: label.toUpperCase(), level: number };
                    }
                }
            }
            : config.nodeEnv === 'development',
    });

    // Security & Utility Plugins
    app.register(import('@fastify/helmet'), { global: true });

    app.register(import('@fastify/rate-limit'), {
        max: 100,
        timeWindow: '1 minute'
    });

    app.register(cors);
    app.register(errorHandler);

    app.register(import('@fastify/jwt'), {
        secret: process.env.JWT_SECRET || 'supersecret',
    });

    // Health check endpoint
    app.get('/health', async (request, reply) => {
        let dbStatus = 'disconnected';
        try {
            const { getPool } = await import('./config/database');
            const pool = getPool();
            await pool.query('SELECT 1');
            dbStatus = 'connected';
        } catch (err) {
            request.log.error(err);
            dbStatus = 'disconnected';
        }

        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: dbStatus
        };
    });

    // API info endpoint
    app.get('/api', async () => ({
        name: 'La Romana 2026 API',
        version: '0.1.0',
        endpoints: {
            auth: '/auth/signup, /auth/login',
            events: '/events',
            courses: '/events/:eventId/course',
            players: '/events/:eventId/players',
            flights: '/events/:eventId/flights',
            scores: '/events/:eventId/flights/:flightId/scores',
            leaderboard: '/events/:eventId/leaderboard',
            spectator: '/spectate/:token/leaderboard'
        }
    }));

    // Register routes
    app.register(authRoutes);
    app.register(eventRoutes);
    app.register(courseRoutes);
    app.register(overrideRoutes);
    app.register(roundRoutes);
    app.register(netoRoutes);
    app.register(sidePotRoutes);
    app.register(playerRoutes);
    app.register(flightRoutes);
    app.register(scoreRoutes);
    app.register(leaderboardRoutes);
    app.register(spectatorRoutes);
    app.register(adminRoutes);
    app.register(inviteRoutes);
    app.register(betRoutes);
    app.register(generalBetRoutes);
    app.register(apuestasRoutes);

    return app;
};
