// Restores data/db.json to the seed data. Usage: npm run reset-db
import { resetDb } from '../src/store.js';

resetDb();
console.log('Database reset to seed data.');
