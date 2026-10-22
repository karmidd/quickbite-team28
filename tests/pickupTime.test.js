// PBI-05 acceptance criteria: select and preserve a future pickup time
import { describe, expect, it } from 'vitest';
import {
  PICKUP_TIME_STORAGE_KEY,
  PickupTimeError,
  PickupTimeSelection,
  generatePickupTimeSlots,
  validatePickupTime
} from '../public/pickup-time.js';

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

const now = new Date('2026-10-21T10:07:00.000Z');
const futureSlot = '2026-10-21T10:30:00.000Z';

describe('pickup-time slot generation', () => {
  it('generates future slots at 15-minute intervals', () => {
    const slots = generatePickupTimeSlots(now, 4);

    expect(slots).toEqual([
      '2026-10-21T10:15:00.000Z',
      '2026-10-21T10:30:00.000Z',
      '2026-10-21T10:45:00.000Z',
      '2026-10-21T11:00:00.000Z'
    ]);
    for (let index = 1; index < slots.length; index += 1) {
      expect(Date.parse(slots[index]) - Date.parse(slots[index - 1])).toBe(15 * 60 * 1000);
    }
  });

  it('uses the next interval when the current time is exactly on a quarter-hour', () => {
    const slots = generatePickupTimeSlots(new Date('2026-10-21T10:15:00.000Z'), 1);
    expect(slots).toEqual(['2026-10-21T10:30:00.000Z']);
  });
});

describe('pickup-time validation', () => {
  it('requires a selection', () => {
    expect(validatePickupTime('', now)).toMatchObject({ valid: false, code: 'MISSING' });
  });

  it('accepts a future time aligned to a 15-minute interval', () => {
    expect(validatePickupTime(futureSlot, now)).toEqual({
      valid: true,
      code: 'VALID',
      message: ''
    });
  });

  it('rejects malformed and non-interval times', () => {
    expect(validatePickupTime('not-a-date', now)).toMatchObject({
      valid: false,
      code: 'INVALID'
    });
    expect(validatePickupTime('Wed, 21 Oct 2026 10:30:00 GMT', now)).toMatchObject({
      valid: false,
      code: 'INVALID'
    });
    expect(validatePickupTime('2026-10-21T10:22:00.000Z', now)).toMatchObject({
      valid: false,
      code: 'INVALID'
    });
  });

  it('rejects past and expired times', () => {
    expect(validatePickupTime('2026-10-21T10:00:00.000Z', now)).toMatchObject({
      valid: false,
      code: 'EXPIRED'
    });
    expect(validatePickupTime('2026-10-21T10:15:00.000Z', new Date(futureSlot))).toMatchObject({
      valid: false,
      code: 'EXPIRED'
    });
  });
});

describe('pickup-time persistence and order summary', () => {
  it('preserves the ISO pickup time for another page and PBI-06', () => {
    const storage = new MemoryStorage();
    const selection = new PickupTimeSelection(storage, () => now);
    selection.select(futureSlot);

    const restored = new PickupTimeSelection(storage, () => now);
    expect(restored.getSelectedTime()).toBe(futureSlot);
    expect(JSON.parse(storage.getItem(PICKUP_TIME_STORAGE_KEY))).toEqual({
      pickupTime: futureSlot
    });
  });

  it('provides the selected time and a display value for the order summary', () => {
    const selection = new PickupTimeSelection(new MemoryStorage(), () => now);
    expect(selection.getSummary()).toBeNull();

    selection.select(futureSlot);
    const summary = selection.getSummary('en-CA', { timeZone: 'UTC' });
    expect(summary.pickupTime).toBe(futureSlot);
    expect(summary.displayTime).toContain('10:30');
  });

  it('rejects invalid selections instead of saving them', () => {
    const storage = new MemoryStorage();
    const selection = new PickupTimeSelection(storage, () => now);

    expect(() => selection.select('2026-10-21T10:22:00.000Z')).toThrow(PickupTimeError);
    expect(storage.getItem(PICKUP_TIME_STORAGE_KEY)).toBeNull();
  });

  it('removes an expired saved selection and reports a clear status', () => {
    const storage = new MemoryStorage();
    storage.setItem(PICKUP_TIME_STORAGE_KEY, JSON.stringify({ pickupTime: futureSlot }));

    const selection = new PickupTimeSelection(
      storage,
      () => new Date('2026-10-21T10:31:00.000Z')
    );
    expect(selection.getSelectedTime()).toBeNull();
    expect(selection.status).toMatchObject({ valid: false, code: 'EXPIRED' });
    expect(selection.status.message).toMatch(/passed/i);
    expect(storage.getItem(PICKUP_TIME_STORAGE_KEY)).toBeNull();
  });

  it('handles corrupted saved data without breaking checkout', () => {
    const storage = new MemoryStorage();
    storage.setItem(PICKUP_TIME_STORAGE_KEY, '{invalid JSON');

    const selection = new PickupTimeSelection(storage, () => now);
    expect(selection.getSelectedTime()).toBeNull();
    expect(selection.status).toMatchObject({ valid: false, code: 'INVALID' });
    expect(storage.getItem(PICKUP_TIME_STORAGE_KEY)).toBeNull();
  });
});
