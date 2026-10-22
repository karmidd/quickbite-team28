// PBI-04 acceptance criteria: add multiple items and quantities to one restaurant cart
import { describe, it, expect, beforeEach } from 'vitest';
import { Cart, CartError, CART_STORAGE_KEY } from '../public/cart.js';

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, value);
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

const restaurant = { id: 'r1', name: 'Le Petit Bistro' };
const otherRestaurant = { id: 'r2', name: 'Sakura Ramen' };
const sandwich = {
  id: 'm1', restaurantId: 'r1', name: 'Croque Monsieur', priceCents: 1295
};
const soup = {
  id: 'm2', restaurantId: 'r1', name: 'French Onion Soup', priceCents: 995
};
const ramen = {
  id: 'm6', restaurantId: 'r2', name: 'Tonkotsu Ramen', priceCents: 1695
};

let storage;
let cart;

beforeEach(() => {
  storage = new MemoryStorage();
  cart = new Cart(storage);
});

describe('shopping cart items and totals', () => {
  it('adds different menu items and calculates the total in integer cents', () => {
    cart.addItem(sandwich, restaurant);
    cart.addItem(soup, restaurant);

    expect(cart.getState().items).toHaveLength(2);
    expect(cart.totalCents).toBe(2290);
    expect(Number.isInteger(cart.totalCents)).toBe(true);
  });

  it('merges duplicate items by increasing their quantity', () => {
    cart.addItem(sandwich, restaurant);
    cart.addItem(sandwich, restaurant);

    expect(cart.getState().items).toEqual([
      { id: 'm1', name: 'Croque Monsieur', priceCents: 1295, quantity: 2 }
    ]);
    expect(cart.itemCount).toBe(2);
    expect(cart.totalCents).toBe(2590);
  });

  it('updates quantities and recalculates the running total', () => {
    cart.addItem(sandwich, restaurant);
    cart.addItem(soup, restaurant);
    cart.updateQuantity('m1', 3);

    expect(cart.itemCount).toBe(4);
    expect(cart.totalCents).toBe(4880);
  });

  it('rejects zero, negative, fractional and missing-item quantity updates', () => {
    cart.addItem(sandwich, restaurant);

    for (const quantity of [0, -1, 1.5, '2']) {
      expect(() => cart.updateQuantity('m1', quantity)).toThrow(CartError);
    }
    expect(() => cart.updateQuantity('missing', 2)).toThrow(/not in the cart/i);
    expect(cart.getState().items[0].quantity).toBe(1);
  });

  it('removes items completely and resets restaurant details when empty', () => {
    cart.addItem(sandwich, restaurant);
    cart.removeItem('m1');

    expect(cart.getState()).toEqual({ restaurantId: null, restaurantName: '', items: [] });
    expect(cart.totalCents).toBe(0);
    expect(storage.getItem(CART_STORAGE_KEY)).toBeNull();
  });
});

describe('one-restaurant restriction', () => {
  it('refuses an item from another restaurant without changing the cart', () => {
    cart.addItem(sandwich, restaurant);

    expect(() => cart.addItem(ramen, otherRestaurant)).toThrowError(
      expect.objectContaining({ code: 'DIFFERENT_RESTAURANT' })
    );
    expect(cart.getState().restaurantId).toBe('r1');
    expect(cart.getState().items.map((item) => item.id)).toEqual(['m1']);
  });

  it('can explicitly clear the old cart and switch restaurants', () => {
    cart.addItem(sandwich, restaurant);
    cart.addItem(ramen, otherRestaurant, { replace: true });

    expect(cart.getState().restaurantId).toBe('r2');
    expect(cart.getState().items.map((item) => item.id)).toEqual(['m6']);
    expect(cart.totalCents).toBe(1695);
  });

  it('rejects an item whose restaurant does not match the selected restaurant', () => {
    expect(() => cart.addItem(sandwich, otherRestaurant)).toThrowError(
      expect.objectContaining({ code: 'INVALID_ITEM' })
    );
  });
});

describe('storage and current menu data', () => {
  it('preserves the cart when a new page creates another Cart instance', () => {
    cart.addItem(sandwich, restaurant);
    cart.updateQuantity('m1', 2);

    const restored = new Cart(storage);
    expect(restored.getState()).toEqual(cart.getState());
    expect(restored.totalCents).toBe(2590);
  });

  it('ignores invalid saved cart data instead of breaking the page', () => {
    storage.setItem(CART_STORAGE_KEY, '{not valid JSON');
    expect(new Cart(storage).getState().items).toEqual([]);
  });

  it('removes missing menu items and refreshes current prices', () => {
    cart.addItem(sandwich, restaurant);
    cart.addItem(soup, restaurant);
    const currentMenu = [{ ...sandwich, name: 'Croque-monsieur', priceCents: 1395 }];

    expect(cart.reconcile(currentMenu)).toEqual(['m2']);
    expect(cart.getState().items[0].name).toBe('Croque-monsieur');
    expect(cart.totalCents).toBe(1395);
  });
});
