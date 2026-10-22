// PBI-07 and PBI-08 acceptance criteria: restaurant dashboard and status updates
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';

process.env.DB_PATH = 'data/test-dashboard.json';
const { app } = await import('../src/app.js');
const { loadDb, saveDb, resetDb } = await import('../src/store.js');

beforeEach(() => {
  resetDb();
});

function addOrder(id, restaurantId, pickupTime) {
  const db = loadDb();
  db.orders.push({
    id,
    restaurantId,
    customerName: 'Test',
    items: [{ menuItemId: 'm1', name: 'Test item', priceCents: 1000, quantity: 2 }],
    totalCents: 2000,
    pickupTime,
    status: 'Received',
    createdAt: '2026-10-20T12:00:00.000Z'
  });
  saveDb(db);
}

describe('GET /api/restaurants/:id/orders (PBI-07)', () => {
  it('only returns orders for that restaurant', async () => {
    addOrder('2001', 'r1', '2026-10-25T17:00:00.000Z');
    const res = await request(app).get('/api/restaurants/r3/orders');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((o) => o.restaurantId === 'r3')).toBe(true);
  });

  it('includes the items, quantities and pickup time of each order', async () => {
    const res = await request(app).get('/api/restaurants/r3/orders');
    const order = res.body[0];
    expect(order.pickupTime).toBeDefined();
    expect(order.items[0].name).toBeDefined();
    expect(order.items[0].quantity).toBeGreaterThan(0);
  });

  it('sorts orders by pickup time, soonest first', async () => {
    addOrder('2002', 'r3', '2026-10-25T23:00:00.000Z');
    addOrder('2003', 'r3', '2026-10-25T08:00:00.000Z');
    const res = await request(app).get('/api/restaurants/r3/orders');
    const times = res.body.map((o) => new Date(o.pickupTime).getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(res.body[0].id).toBe('2003');
  });

  it('returns 404 for an unknown restaurant', async () => {
    const res = await request(app).get('/api/restaurants/nope/orders');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/orders/:id/status (PBI-08)', () => {
  it('moves the status forward one step and saves it', async () => {
    const res = await request(app).patch('/api/orders/1001/status').send({ status: 'Preparing' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Preparing');

    // The customer's status page sees the change straight away
    const check = await request(app).get('/api/orders/1001');
    expect(check.body.status).toBe('Preparing');
  });

  it('rejects skipping a step', async () => {
    const res = await request(app).patch('/api/orders/1001/status').send({ status: 'Ready for Pickup' });
    expect(res.status).toBe(400);
    expect(loadDb().orders.find((o) => o.id === '1001').status).toBe('Received');
  });

  it('rejects moving backwards', async () => {
    const res = await request(app).patch('/api/orders/1002/status').send({ status: 'Received' });
    expect(res.status).toBe(400);
    expect(loadDb().orders.find((o) => o.id === '1002').status).toBe('Preparing');
  });

  it('rejects changes to a completed order', async () => {
    const db = loadDb();
    db.orders.find((o) => o.id === '1001').status = 'Completed';
    saveDb(db);
    const res = await request(app).patch('/api/orders/1001/status').send({ status: 'Received' });
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown order', async () => {
    const res = await request(app).patch('/api/orders/9999/status').send({ status: 'Preparing' });
    expect(res.status).toBe(404);
  });
});
