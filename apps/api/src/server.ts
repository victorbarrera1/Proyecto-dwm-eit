import { createApp } from './app.js';
import { getConfig } from './config.js';
import { closeDatabase, initializeDatabase } from './db/database.js';
import { seedDatabase } from './db/seed.js';

const config = getConfig();
initializeDatabase();
if (config.autoSeed) await seedDatabase();

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`API disponible en http://localhost:${config.port}/api/v1`);
});

function shutdown(signal: string): void {
  console.log(`Cerrando servidor por ${signal}.`);
  server.close(() => {
    closeDatabase();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
