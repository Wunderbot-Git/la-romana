import { buildApp } from './app';
import { config } from './config/env';

const start = async () => {
    const app = buildApp();

    try {
        // Run migrations on startup
        const { runMigrations, closePool } = await import('./config/database');
        await runMigrations();

        await app.listen({ port: config.port, host: '0.0.0.0' });
        console.log(`Server listening on port ${config.port}`);

        // Graceful shutdown
        const signals = ['SIGINT', 'SIGTERM'];
        signals.forEach((signal) => {
            process.on(signal, async () => {
                console.log(`${signal} received, closing database connection...`);
                await closePool();
                process.exit(0);
            });
        });
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
