// The Express app: serves the pages in public/ and the /api routes.
// Each PBI adds its own routes here (see the API table in README.md).
import express from 'express';
import { validatePickupTime } from '../public/pickup-time.js';
import { loadDb, saveDb, STATUSES } from './store.js';

export const app = express();

app.use(express.json());
app.use(express.static('public'));

// PBI-02: list all restaurants
app.get('/api/restaurants', (req, res) => {
  const db = loadDb();
  res.json(db.restaurants);
});

// PBI-03: menu items for one restaurant (404 if the restaurant is unknown)
app.get('/api/restaurants/:id/menu', (req, res) => {
  const db = loadDb();
  const restaurant = db.restaurants.find((r) => r.id === req.params.id);
  if (!restaurant) {
    return res.status(404).json({ error: 'Restaurant not found' });
  }
  res.json(db.menuItems.filter((item) => item.restaurantId === restaurant.id));
});

// PBI-06: create an order after validating all client-provided IDs and quantities
app.post('/api/orders', (req, res) => {
  const { restaurantId, customerName, items, pickupTime } = req.body || {};
  const db = loadDb();
  const restaurant = db.restaurants.find((entry) => entry.id === restaurantId);

  if (!restaurant) {
    return res.status(400).json({ error: 'Select a valid restaurant.' });
  }
  if (typeof customerName !== 'string' || customerName.trim().length === 0) {
    return res.status(400).json({ error: 'Customer name is required.' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'The cart cannot be empty.' });
  }

  const pickupValidation = validatePickupTime(pickupTime);
  if (!pickupValidation.valid) {
    return res.status(400).json({ error: pickupValidation.message });
  }

  const seenItemIds = new Set();
  const orderItems = [];
  let totalCents = 0;

  for (const requestedItem of items) {
    const menuItemId = requestedItem && requestedItem.menuItemId;
    const quantity = requestedItem && requestedItem.quantity;
    if (typeof menuItemId !== 'string' || !Number.isSafeInteger(quantity) || quantity < 1) {
      return res.status(400).json({ error: 'Every item needs a valid menu item ID and quantity.' });
    }
    if (seenItemIds.has(menuItemId)) {
      return res.status(400).json({ error: 'Duplicate menu items must be combined into one quantity.' });
    }
    seenItemIds.add(menuItemId);

    const menuItem = db.menuItems.find((entry) => entry.id === menuItemId);
    if (!menuItem) {
      return res.status(400).json({ error: `Menu item ${menuItemId} was not found.` });
    }
    if (menuItem.restaurantId !== restaurant.id) {
      return res.status(400).json({ error: 'All items must come from the selected restaurant.' });
    }

    const lineTotal = menuItem.priceCents * quantity;
    if (!Number.isSafeInteger(lineTotal) || !Number.isSafeInteger(totalCents + lineTotal)) {
      return res.status(400).json({ error: 'The requested quantity is too large.' });
    }
    totalCents += lineTotal;
    orderItems.push({
      menuItemId: menuItem.id,
      name: menuItem.name,
      priceCents: menuItem.priceCents,
      quantity
    });
  }

  const highestOrderId = db.orders.reduce((highest, order) => {
    if (typeof order.id !== 'string' || !/^\d+$/.test(order.id)) return highest;
    const numericId = Number(order.id);
    return Number.isSafeInteger(numericId) ? Math.max(highest, numericId) : highest;
  }, 1000);
  const order = {
    id: String(highestOrderId + 1),
    restaurantId: restaurant.id,
    customerName: customerName.trim(),
    items: orderItems,
    totalCents,
    pickupTime,
    status: STATUSES[0],
    createdAt: new Date().toISOString()
  };

  db.orders.push(order);
  saveDb(db);
  return res.status(201).json({ ...order, restaurantName: restaurant.name });
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
