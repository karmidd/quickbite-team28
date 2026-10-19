// PBI-01 acceptance criteria: seed data and data model
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';

process.env.DB_PATH = 'data/test-setup.json';
const { app } = await import('../src/app.js');
const { loadDb, resetDb, STATUSES } = await import('../src/store.js');

beforeEach(() => {
  resetDb();
});

describe('seed data', () => {
  it('has at least 3 restaurants', () => {
    const db = loadDb();
    expect(db.restaurants.length).toBeGreaterThanOrEqual(3);
  });

  it('has at least 5 menu items for every restaurant', () => {
    const db = loadDb();
    for (const restaurant of db.restaurants) {
      const items = db.menuItems.filter((item) => item.restaurantId === restaurant.id);
      expect(items.length, restaurant.name).toBeGreaterThanOrEqual(5);
    }
  });

  it('only uses valid order statuses', () => {
    const db = loadDb();
    for (const order of db.orders) {
      expect(STATUSES).toContain(order.status);
    }
  });
});

describe('order statuses', () => {
  it('are Received, Preparing, Ready for Pickup and Completed, in that order', () => {
    expect(STATUSES).toEqual(['Received', 'Preparing', 'Ready for Pickup', 'Completed']);
  });
});

describe('GET /api/restaurants', () => {
  it('returns every restaurant with its name and cuisine', async () => {
    const res = await request(app).get('/api/restaurants');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(3);
    expect(res.body[0]).toHaveProperty('name');
    expect(res.body[0]).toHaveProperty('cuisine');
  });
});
