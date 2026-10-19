// The Express app: serves the pages in public/ and the /api routes.
// Each PBI adds its own routes here (see the API table in README.md).
import express from 'express';
import { loadDb } from './store.js';

export const app = express();

app.use(express.json());
app.use(express.static('public'));

// PBI-02: list all restaurants
app.get('/api/restaurants', (req, res) => {
  const db = loadDb();
  res.json(db.restaurants);
});
