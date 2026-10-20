// PBI-02 acceptance criteria: customer views the list of restaurants
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';

process.env.DB_PATH = 'data/test-restaurant-list.json';
const { app } = await import('../src/app.js');
const { loadDb, saveDb, resetDb } = await import('../src/store.js');

beforeEach(() => {
  resetDb();
});

describe('GET /api/restaurants', () => {
  it('shows each restaurant with its name and cuisine type', async () => {
    const res = await request(app).get('/api/restaurants');
    expect(res.status).toBe(200);
    for (const restaurant of res.body) {
      expect(restaurant.name).toBeTruthy();
      expect(restaurant.cuisine).toBeTruthy();
    }
    expect(res.body.map((r) => r.name)).toContain('Sakura Ramen');
  });

  it('gives every restaurant an id so the page can link to its menu', async () => {
    const res = await request(app).get('/api/restaurants');
    for (const restaurant of res.body) {
      expect(restaurant.id).toBeTruthy();
    }
  });

  it('returns an empty list when there are no restaurants', async () => {
    const db = loadDb();
    db.restaurants = [];
    saveDb(db);

    const res = await request(app).get('/api/restaurants');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('home page', () => {
  it('is served at /', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Restaurants');
  });
});
