import { z } from 'zod';

export const rideRequestSchema = z.object({
  pickup: z.string().trim().min(3, 'Enter a pickup location.').max(160),
  destination: z.string().trim().min(3, 'Enter a destination.').max(160),
  passengers: z.number().int().min(1).max(6),
}).refine(value => value.pickup.toLowerCase() !== value.destination.toLowerCase(), {
  message: 'Choose a different destination.', path: ['destination'],
});

export const fareSchema = z.number().int().min(100).max(20000);
export type RideRequestInput = z.infer<typeof rideRequestSchema>;

export function validationMessage(error: unknown): string {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? 'Check your entries.';
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export function dollarsToCents(value: string): number {
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(value.trim())) throw new Error('Enter a price with up to two decimal places.');
  const [whole, fraction = ''] = value.trim().split('.');
  return fareSchema.parse(Number(whole) * 100 + Number(fraction.padEnd(2, '0')));
}
