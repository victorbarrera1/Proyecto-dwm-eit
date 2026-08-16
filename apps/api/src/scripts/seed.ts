import { closeDatabase } from '../db/database.js';
import { seedDatabase } from '../db/seed.js';

await seedDatabase();
console.log('Datos de demostración creados correctamente.');
closeDatabase();
