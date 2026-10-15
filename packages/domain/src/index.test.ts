import { describe, expect, it } from 'vitest';
import { DEMO_DRIVERS, INITIAL_STATE, demoReducer, priceBreakdown } from './index';
import { dollarsToCents } from '@dd/validation';

const input = { pickup: 'Front Campus', destination: 'Downtown', passengers: 2 };
describe('pilot ride workflow', () => {
  it('calculates a complete, rounded booking price', () => {
    expect(priceBreakdown(750)).toEqual({ fareCents: 750, feeCents: 113, totalCents: 863 });
    expect(dollarsToCents('7.50')).toBe(750);
    expect(() => dollarsToCents('7.555')).toThrow();
    expect(() => dollarsToCents('-1')).toThrow();
  });
  it('lets a driver update a quote, then locks the accepted price through completion', () => {
    let state = demoReducer(INITIAL_STATE, { type: 'request', input, now: 0 });
    state = demoReducer(state, { type: 'offer', driver: DEMO_DRIVERS[0], fareCents: 1000, now: 1 });
    state = demoReducer(state, { type: 'accept', offerId: 'avery', now: 2 });
    expect(state.trip?.offer.totalCents).toBe(1150);
    expect(() => demoReducer(state, { type: 'offer', driver: DEMO_DRIVERS[0], fareCents: 2000, now: 3 })).toThrow('no longer open');
    for (let i = 0; i < 3; i++) state = demoReducer(state, { type: 'advance' });
    expect(state.trip?.status).toBe('completed');
    state = demoReducer(state, { type: 'rate', score: 5 });
    expect(state.rating).toBe(5);
    expect(() => demoReducer(state, { type: 'advance' })).toThrow('ended');
  });
  it('rejects expired offers and duplicate acceptances', () => {
    const state = demoReducer(INITIAL_STATE, { type: 'request', input, now: 0 });
    expect(() => demoReducer(state, { type: 'accept', offerId: 'avery', now: 300001 })).toThrow('expired');
    const booked = demoReducer(state, { type: 'accept', offerId: 'avery', now: 1 });
    expect(() => demoReducer(booked, { type: 'accept', offerId: 'jordan', now: 2 })).toThrow('no longer open');
    expect(() => demoReducer(booked, { type: 'rate', score: 5 })).toThrow();
  });
  it('filters vehicle capacity and rejects an undersized driver offer', () => {
    const state = demoReducer(INITIAL_STATE, { type: 'request', input: { ...input, passengers: 6 }, now: 0 });
    expect(state.offers.map(o => o.driver.id)).toEqual(['sam']);
    expect(() => demoReducer(state, { type: 'offer', driver: DEMO_DRIVERS[0], fareCents: 600, now: 1 })).toThrow('seats');
  });
  it('validates distinct locations and preserves favorites between rides', () => {
    expect(() => demoReducer(INITIAL_STATE, { type: 'request', input: { ...input, destination: input.pickup }, now: 0 })).toThrow();
    const state = demoReducer(INITIAL_STATE, { type: 'favorite', driverId: 'avery' });
    expect(demoReducer(state, { type: 'reset' }).favorites).toEqual(['avery']);
  });
});
