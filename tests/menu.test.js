// PBI-03 acceptance criteria: customer views a restaurant's menu
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';

process.env.DB_PATH = 'data/test-menu.json';
const { app } = await import('../src/app.js');
const { resetDb } = await import('../src/store.js');

beforeEach(() => {
  resetDb();
});

describe('GET /api/restaurants/:id/menu', () => {
  it('gives each item a name, description and price', async () => {
    const res = await request(app).get('/api/restaurants/r1/menu');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const item of res.body) {
      expect(item.name).toBeTruthy();
      expect(item.description).toBeTruthy();
      expect(Number.isInteger(item.priceCents)).toBe(true);
    }
  });

  it('only shows the items of the selected restaurant', async () => {
    const res = await request(app).get('/api/restaurants/r2/menu');
    expect(res.body.length).toBe(5);
    for (const item of res.body) {
      expect(item.restaurantId).toBe('r2');
    }
    expect(res.body.map((item) => item.name)).toContain('Tonkotsu Ramen');
    expect(res.body.map((item) => item.name)).not.toContain('Croque Monsieur');
  });

  it('returns 404 with a "not found" message for an unknown restaurant', async () => {
    const res = await request(app).get('/api/restaurants/r999/menu');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});
