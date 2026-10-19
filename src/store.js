// Shared data access for the whole app.
// Data lives in data/db.json. That file is created from data/seed.json the first
// time the app runs, and it is not committed, so placing test orders never
// creates git changes. Run `npm run reset-db` to go back to the seed data.
import fs from 'node:fs';
import path from 'node:path';

// Order statuses, in the only order they are allowed to move (PBI-08).
export const STATUSES = ['Received', 'Preparing', 'Ready for Pickup', 'Completed'];

const SEED_PATH = path.resolve('data/seed.json');

// Tests set DB_PATH so they work on their own copy of the data.
function dbPath() {
  return path.resolve(process.env.DB_PATH || 'data/db.json');
}

export function resetDb() {
  fs.copyFileSync(SEED_PATH, dbPath());
}

export function loadDb() {
  if (!fs.existsSync(dbPath())) {
    resetDb();
  }
  return JSON.parse(fs.readFileSync(dbPath(), 'utf-8'));
}

export function saveDb(db) {
  fs.writeFileSync(dbPath(), JSON.stringify(db, null, 2) + '\n');
}
