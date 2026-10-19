// PBI-09 acceptance criteria: customer views order status
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';

process.env.DB_PATH = 'data/test-order-status.json';
const { app } = await import('../src/app.js');
const { loadDb, saveDb, resetDb } = await import('../src/store.js');

beforeEach(() => {
  resetDb();
});

describe('GET /api/orders/:id', () => {
  it('returns the current status and pickup time of a known order', async () => {
    const res = await request(app).get('/api/orders/1001');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Received');
    expect(res.body.pickupTime).toBe('2026-10-25T18:00:00.000Z');
  });

  it('includes the restaurant name so the page can show it', async () => {
    const res = await request(app).get('/api/orders/1001');
    expect(res.body.restaurantName).toBe('Beirut Grill');
  });

  it('shows the new status after the restaurant updates it', async () => {
    const db = loadDb();
    db.orders.find((o) => o.id === '1001').status = 'Preparing';
    saveDb(db);

    const res = await request(app).get('/api/orders/1001');
    expect(res.body.status).toBe('Preparing');
  });

  it('returns 404 with a "not found" message for an unknown order ID', async () => {
    const res = await request(app).get('/api/orders/9999');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});
