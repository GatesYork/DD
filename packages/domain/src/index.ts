import { fareSchema, rideRequestSchema, type RideRequestInput } from '@dd/validation';

export type TripStatus = 'confirmed' | 'arriving' | 'in_progress' | 'completed' | 'cancelled';
export type Driver = { id: string; name: string; initials: string; school: string; car: string; seats: number; rating: string; minutes: number };
export type Offer = { id: string; driver: Driver; fareCents: number; feeCents: number; totalCents: number; perPersonCents: number; driverEarningsCents: number; expiresAt: number };
export type DemoTrip = { id: string; request: RideRequestInput; offer: Offer; status: TripStatus };
export type DemoState = { request: RideRequestInput | null; offers: Offer[]; trip: DemoTrip | null; favorites: string[]; rating: number | null };
export const INITIAL_STATE: DemoState = { request: null, offers: [], trip: null, favorites: [], rating: null };
export const DEMO_DRIVERS: Driver[] = [
  { id: 'avery', name: 'Avery M.', initials: 'AM', school: 'Georgia College', car: 'Blue Toyota Camry', seats: 4, rating: '4.9', minutes: 4 },
  { id: 'jordan', name: 'Jordan T.', initials: 'JT', school: 'Georgia College', car: 'White Honda CR-V', seats: 4, rating: '4.8', minutes: 6 },
  { id: 'sam', name: 'Sam R.', initials: 'SR', school: 'Georgia College', car: 'Silver Kia Sorento', seats: 6, rating: '4.9', minutes: 8 },
];
export function priceBreakdown(fareCents: number, feeBasisPoints = 1500, passengers = 1) {
  fareSchema.parse(fareCents);
  if (!Number.isInteger(feeBasisPoints) || feeBasisPoints < 0 || feeBasisPoints > 10000) throw new Error('Invalid fee rate.');
  if (fareCents % 100 !== 0) throw new Error('Use whole-dollar prices per person.');
  if (!Number.isInteger(passengers) || passengers < 1 || passengers > 6) throw new Error('Choose 1 to 6 passengers.');
  const totalCents = fareCents * passengers;
  const feeCents = Math.round(totalCents * feeBasisPoints / 10000);
  return { perPersonCents: fareCents, fareCents: totalCents, feeCents, totalCents, driverEarningsCents: totalCents - feeCents };
}
export const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
export type DemoAction =
  | { type: 'request'; input: RideRequestInput; now: number; fareCents?: number }
  | { type: 'offer'; driver: Driver; fareCents: number; now: number }
  | { type: 'accept'; offerId: string; now: number }
  | { type: 'advance' }
  | { type: 'cancel' }
  | { type: 'favorite'; driverId: string }
  | { type: 'rate'; score: number }
  | { type: 'reset' };

// Explicitly simulated. Live clients must use server operations, never this reducer for authorization.
export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case 'request': {
      if (state.request || state.trip) throw new Error('Finish or reset the current ride first.');
      const request = rideRequestSchema.parse(action.input);
      const offers = DEMO_DRIVERS.filter(d => d.seats >= request.passengers).map((driver, i) => ({
        id: driver.id, driver, ...priceBreakdown(action.fareCents ?? 500, 1500, request.passengers), expiresAt: action.now + 300000,
      }));
      return { ...state, request, offers, rating: null };
    }
    case 'offer': {
      if (!state.request || state.trip) throw new Error('This request is no longer open.');
      if (action.driver.seats < state.request.passengers) throw new Error('Not enough passenger seats.');
      const offer = { id: action.driver.id, driver: action.driver, ...priceBreakdown(action.fareCents, 1500, state.request.passengers), expiresAt: action.now + 300000 };
      return { ...state, offers: [...state.offers.filter(o => o.id !== offer.id), offer] };
    }
    case 'accept': {
      if (!state.request || state.trip) throw new Error('This request is no longer open.');
      const offer = state.offers.find(o => o.id === action.offerId);
      if (!offer || offer.expiresAt <= action.now) throw new Error('This offer expired. Start a new request.');
      return { ...state, offers: [], trip: { id: 'DD-DEMO-001', request: state.request, offer, status: 'confirmed' } };
    }
    case 'advance': {
      if (!state.trip) throw new Error('No active ride.');
      const next: Partial<Record<TripStatus, TripStatus>> = { confirmed: 'arriving', arriving: 'in_progress', in_progress: 'completed' };
      const status = next[state.trip.status];
      if (!status) throw new Error('This ride has ended.');
      return { ...state, trip: { ...state.trip, status } };
    }
    case 'cancel':
      if (state.trip && !['confirmed', 'arriving'].includes(state.trip.status)) throw new Error('This ride cannot be cancelled here.');
      return state.trip ? { ...state, trip: { ...state.trip, status: 'cancelled' } } : { ...INITIAL_STATE, favorites: state.favorites };
    case 'favorite':
      return { ...state, favorites: state.favorites.includes(action.driverId) ? state.favorites.filter(id => id !== action.driverId) : [...state.favorites, action.driverId] };
    case 'rate':
      if (state.trip?.status !== 'completed' || !Number.isInteger(action.score) || action.score < 1 || action.score > 5) throw new Error('Ratings require a completed ride and a score from 1 to 5.');
      return { ...state, rating: action.score };
    case 'reset':
      return { ...INITIAL_STATE, favorites: state.favorites };
  }
}
