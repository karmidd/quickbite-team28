// PBI-05 pickup-time selection. PBI-06 can read the selected ISO time from this class.
export const PICKUP_TIME_STORAGE_KEY = 'quickbite.pickupTime';
export const PICKUP_INTERVAL_MINUTES = 15;
export const DEFAULT_SLOT_COUNT = 12;

const INTERVAL_MS = PICKUP_INTERVAL_MINUTES * 60 * 1000;

export class PickupTimeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PickupTimeError';
    this.code = code;
  }
}

export function generatePickupTimeSlots(now = new Date(), count = DEFAULT_SLOT_COUNT) {
  const nowMs = now instanceof Date ? now.getTime() : Number.NaN;
  if (!Number.isFinite(nowMs)) throw new TypeError('A valid current time is required.');
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError('The number of pickup slots must be a positive whole number.');
  }

  // Start at the next quarter-hour, even when the current time is exactly on one.
  const firstSlotMs = Math.floor(nowMs / INTERVAL_MS) * INTERVAL_MS + INTERVAL_MS;
  return Array.from(
    { length: count },
    (_, index) => new Date(firstSlotMs + index * INTERVAL_MS).toISOString()
  );
}

export function validatePickupTime(value, now = new Date()) {
  if (typeof value !== 'string' || value.length === 0) {
    return {
      valid: false,
      code: 'MISSING',
      message: 'Please select a pickup time before continuing.'
    };
  }

  const pickupMs = Date.parse(value);
  const nowMs = now instanceof Date ? now.getTime() : Number.NaN;
  const isCanonicalIso = Number.isFinite(pickupMs)
    && new Date(pickupMs).toISOString() === value;
  if (!isCanonicalIso || !Number.isFinite(nowMs) || pickupMs % INTERVAL_MS !== 0) {
    return {
      valid: false,
      code: 'INVALID',
      message: 'Select a valid pickup time in a 15-minute interval.'
    };
  }
  if (pickupMs <= nowMs) {
    return {
      valid: false,
      code: 'EXPIRED',
      message: 'That pickup time has passed. Please select a new time.'
    };
  }

  return { valid: true, code: 'VALID', message: '' };
}

export function formatPickupTime(value, locales, options = {}) {
  return new Intl.DateTimeFormat(locales, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...options
  }).format(new Date(value));
}

export class PickupTimeSelection {
  constructor(storage = globalThis.localStorage, now = () => new Date()) {
    this.storage = storage;
    this.now = now;
    this.pickupTime = null;
    this.status = validatePickupTime(null, this.now());
    this.load();
  }

  load() {
    if (!this.storage) return;

    try {
      const saved = JSON.parse(this.storage.getItem(PICKUP_TIME_STORAGE_KEY));
      const value = saved && saved.pickupTime;
      const result = validatePickupTime(value, this.now());
      this.status = result;
      if (result.valid) {
        this.pickupTime = value;
      } else if (value) {
        this.storage.removeItem(PICKUP_TIME_STORAGE_KEY);
      }
    } catch {
      this.status = {
        valid: false,
        code: 'INVALID',
        message: 'The saved pickup time was invalid. Please select a new time.'
      };
      this.storage.removeItem(PICKUP_TIME_STORAGE_KEY);
    }
  }

  select(value) {
    const result = validatePickupTime(value, this.now());
    if (!result.valid) throw new PickupTimeError(result.code, result.message);

    this.pickupTime = value;
    this.status = result;
    if (this.storage) {
      this.storage.setItem(PICKUP_TIME_STORAGE_KEY, JSON.stringify({ pickupTime: value }));
    }
    return value;
  }

  clear() {
    this.pickupTime = null;
    this.status = validatePickupTime(null, this.now());
    if (this.storage) this.storage.removeItem(PICKUP_TIME_STORAGE_KEY);
  }

  getSelectedTime() {
    if (!this.pickupTime) return null;

    const result = validatePickupTime(this.pickupTime, this.now());
    this.status = result;
    if (!result.valid) {
      this.pickupTime = null;
      if (this.storage) this.storage.removeItem(PICKUP_TIME_STORAGE_KEY);
      return null;
    }
    return this.pickupTime;
  }

  getSummary(locales, options) {
    const pickupTime = this.getSelectedTime();
    if (!pickupTime) return null;
    return {
      pickupTime,
      displayTime: formatPickupTime(pickupTime, locales, options)
    };
  }
}
