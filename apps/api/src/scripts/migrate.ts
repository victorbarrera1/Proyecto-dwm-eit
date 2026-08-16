import { closeDatabase, initializeDatabase } from '../db/database.js';

initializeDatabase();
console.log('Migraciones aplicadas correctamente.');
closeDatabase();
