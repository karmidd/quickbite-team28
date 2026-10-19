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

// PBI-09: one order, for the customer's status page
app.get('/api/orders/:id', (req, res) => {
  const db = loadDb();
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  const restaurant = db.restaurants.find((r) => r.id === order.restaurantId);
  res.json({ ...order, restaurantName: restaurant ? restaurant.name : null });
});
