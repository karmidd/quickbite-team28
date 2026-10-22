// PBI-04 shopping cart. The cart is kept client-side until PBI-06 submits it.
export const CART_STORAGE_KEY = 'quickbite.cart';

export class CartError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'CartError';
    this.code = code;
  }
}

function emptyState() {
  return { restaurantId: null, restaurantName: '', items: [] };
}

function validItem(item) {
  return item
    && typeof item.id === 'string'
    && item.id.length > 0
    && typeof item.name === 'string'
    && Number.isInteger(item.priceCents)
    && item.priceCents >= 0;
}

export class Cart {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.state = this.load();
  }

  load() {
    if (!this.storage) return emptyState();

    try {
      const saved = JSON.parse(this.storage.getItem(CART_STORAGE_KEY));
      if (!saved || typeof saved.restaurantId !== 'string' || !Array.isArray(saved.items)) {
        return emptyState();
      }

      const items = saved.items.filter((item) =>
        validItem(item) && Number.isInteger(item.quantity) && item.quantity > 0
      );
      if (items.length === 0) return emptyState();

      return {
        restaurantId: saved.restaurantId,
        restaurantName: typeof saved.restaurantName === 'string' ? saved.restaurantName : '',
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          priceCents: item.priceCents,
          quantity: item.quantity
        }))
      };
    } catch {
      return emptyState();
    }
  }

  save() {
    if (!this.storage) return;
    if (this.state.items.length === 0) {
      this.storage.removeItem(CART_STORAGE_KEY);
    } else {
      this.storage.setItem(CART_STORAGE_KEY, JSON.stringify(this.state));
    }
  }

  addItem(item, restaurant, { replace = false } = {}) {
    if (!validItem(item)
      || !restaurant
      || typeof restaurant.id !== 'string'
      || item.restaurantId !== restaurant.id) {
      throw new CartError('INVALID_ITEM', 'This menu item cannot be added to the cart.');
    }

    if (this.state.restaurantId && this.state.restaurantId !== restaurant.id) {
      if (!replace) {
        throw new CartError(
          'DIFFERENT_RESTAURANT',
          `Your cart contains items from ${this.state.restaurantName || 'another restaurant'}.`
        );
      }
      this.state = emptyState();
    }

    this.state.restaurantId = restaurant.id;
    this.state.restaurantName = restaurant.name || '';
    const existing = this.state.items.find((cartItem) => cartItem.id === item.id);
    if (existing) {
      existing.quantity += 1;
      // Keep menu details current when an item is added again.
      existing.name = item.name;
      existing.priceCents = item.priceCents;
    } else {
      this.state.items.push({
        id: item.id,
        name: item.name,
        priceCents: item.priceCents,
        quantity: 1
      });
    }
    this.save();
    return this.getState();
  }

  updateQuantity(itemId, quantity) {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new CartError('INVALID_QUANTITY', 'Quantity must be a whole number of at least 1.');
    }
    const item = this.state.items.find((cartItem) => cartItem.id === itemId);
    if (!item) throw new CartError('ITEM_NOT_FOUND', 'That item is not in the cart.');
    item.quantity = quantity;
    this.save();
    return this.getState();
  }

  removeItem(itemId) {
    const originalLength = this.state.items.length;
    this.state.items = this.state.items.filter((item) => item.id !== itemId);
    if (this.state.items.length === 0) this.state = emptyState();
    if (this.state.items.length !== originalLength) this.save();
    return this.getState();
  }

  clear() {
    this.state = emptyState();
    this.save();
  }

  reconcile(menuItems) {
    const available = new Map(
      menuItems
        .filter((item) => validItem(item) && item.restaurantId === this.state.restaurantId)
        .map((item) => [item.id, item])
    );
    const removedIds = this.state.items
      .filter((item) => !available.has(item.id))
      .map((item) => item.id);

    this.state.items = this.state.items
      .filter((item) => available.has(item.id))
      .map((item) => {
        const current = available.get(item.id);
        return { ...item, name: current.name, priceCents: current.priceCents };
      });
    if (this.state.items.length === 0) this.state = emptyState();
    this.save();
    return removedIds;
  }

  get totalCents() {
    return this.state.items.reduce(
      (total, item) => total + item.priceCents * item.quantity,
      0
    );
  }

  get itemCount() {
    return this.state.items.reduce((total, item) => total + item.quantity, 0);
  }

  getState() {
    return structuredClone(this.state);
  }
}
