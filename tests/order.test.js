// PBI-06 acceptance criteria: validate and save a submitted customer order
import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

process.env.DB_PATH = 'data/test-order.json';
const { app } = await import('../src/app.js');
const { loadDb, resetDb, STATUSES } = await import('../src/store.js');

const INTERVAL_MS = 15 * 60 * 1000;

function futurePickupTime() {
  return new Date(Math.floor(Date.now() / INTERVAL_MS) * INTERVAL_MS + 2 * INTERVAL_MS)
    .toISOString();
}

function validOrder(overrides = {}) {
  return {
    restaurantId: 'r1',
    customerName: 'Alex Customer',
    pickupTime: futurePickupTime(),
    items: [
      { menuItemId: 'm1', quantity: 2 },
      { menuItemId: 'm2', quantity: 1 }
    ],
    ...overrides
  };
}

beforeEach(() => {
  resetDb();
});

describe('POST /api/orders successful submission', () => {
  it('creates and persists a complete order with the initial Received status', async () => {
    const response = await request(app).post('/api/orders').send(validOrder());

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: '1003',
      restaurantId: 'r1',
      restaurantName: 'Le Petit Bistro',
      customerName: 'Alex Customer',
      status: STATUSES[0],
      totalCents: 3585
    });
    expect(response.body.createdAt).toBeTruthy();
    expect(response.body.items).toEqual([
      { menuItemId: 'm1', name: 'Croque Monsieur', priceCents: 1295, quantity: 2 },
      { menuItemId: 'm2', name: 'French Onion Soup', priceCents: 995, quantity: 1 }
    ]);

    const savedOrder = loadDb().orders.find((order) => order.id === response.body.id);
    expect(savedOrder).toEqual(expect.objectContaining({
      status: 'Received',
      totalCents: 3585,
      pickupTime: response.body.pickupTime
    }));
  });

  it('calculates prices on the server and ignores client-provided price, name, total and status', async () => {
    const body = validOrder({
      totalCents: 1,
      status: 'Completed',
      items: [{
        menuItemId: 'm4',
        quantity: 2,
        name: 'Cheap steak',
        priceCents: 1
      }]
    });
    const response = await request(app).post('/api/orders').send(body);

    expect(response.status).toBe(201);
    expect(response.body.totalCents).toBe(4990);
    expect(response.body.status).toBe('Received');
    expect(response.body.items[0]).toEqual({
      menuItemId: 'm4',
      name: 'Steak Frites',
      priceCents: 2495,
      quantity: 2
    });
  });

  it('makes the created order available through customer order tracking', async () => {
    const created = await request(app).post('/api/orders').send(validOrder());
    const tracked = await request(app).get(`/api/orders/${created.body.id}`);

    expect(tracked.status).toBe(200);
    expect(tracked.body.id).toBe(created.body.id);
    expect(tracked.body.restaurantName).toBe('Le Petit Bistro');
    expect(tracked.body.status).toBe('Received');
  });
});

describe('POST /api/orders validation', () => {
  it('rejects an empty or missing cart without saving an order', async () => {
    for (const items of [[], undefined, null]) {
      const body = validOrder();
      if (items === undefined) delete body.items;
      else body.items = items;

      const response = await request(app).post('/api/orders').send(body);
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/cart.*empty/i);
      expect(loadDb().orders).toHaveLength(2);
    }
  });

  it('rejects missing, malformed, non-interval, and expired pickup times', async () => {
    const pastTime = new Date(
      Math.floor(Date.now() / INTERVAL_MS) * INTERVAL_MS - INTERVAL_MS
    ).toISOString();
    for (const pickupTime of ['', 'not-a-date', new Date(Date.now() + 10 * 60 * 1000).toISOString(), pastTime]) {
      const response = await request(app)
        .post('/api/orders')
        .send(validOrder({ pickupTime }));

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/pickup time|15-minute|passed/i);
      expect(loadDb().orders).toHaveLength(2);
    }
  });

  it('rejects invalid quantities', async () => {
    for (const quantity of [0, -1, 1.5, '2']) {
      const response = await request(app)
        .post('/api/orders')
        .send(validOrder({ items: [{ menuItemId: 'm1', quantity }] }));

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/quantity/i);
      expect(loadDb().orders).toHaveLength(2);
    }
  });

  it('rejects unknown menu items', async () => {
    const response = await request(app).post('/api/orders').send(validOrder({
      items: [{ menuItemId: 'missing', quantity: 1 }]
    }));

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/not found/i);
    expect(loadDb().orders).toHaveLength(2);
  });

  it('rejects menu items from a different restaurant', async () => {
    const response = await request(app).post('/api/orders').send(validOrder({
      items: [{ menuItemId: 'm6', quantity: 1 }]
    }));

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/selected restaurant/i);
    expect(loadDb().orders).toHaveLength(2);
  });

  it('rejects duplicate menu-item entries', async () => {
    const response = await request(app).post('/api/orders').send(validOrder({
      items: [
        { menuItemId: 'm1', quantity: 1 },
        { menuItemId: 'm1', quantity: 2 }
      ]
    }));

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/duplicate/i);
    expect(loadDb().orders).toHaveLength(2);
  });

  it('rejects an unknown restaurant and a missing customer name', async () => {
    const unknownRestaurant = await request(app).post('/api/orders').send(validOrder({
      restaurantId: 'missing'
    }));
    expect(unknownRestaurant.status).toBe(400);
    expect(unknownRestaurant.body.error).toMatch(/restaurant/i);

    const missingName = await request(app).post('/api/orders').send(validOrder({
      customerName: '   '
    }));
    expect(missingName.status).toBe(400);
    expect(missingName.body.error).toMatch(/name/i);
    expect(loadDb().orders).toHaveLength(2);
  });
});
