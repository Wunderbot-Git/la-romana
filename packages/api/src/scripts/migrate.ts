import { runMigrations, closePool } from '../config/database';

runMigrations()
    .then(() => {
        console.log('Migration script completed');
        return closePool();
    })
    .catch((err) => {
        console.error('Migration script failed', err);
        process.exit(1);
    });
