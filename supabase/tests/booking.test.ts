import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

// Real PostgreSQL engine, with a minimal auth shim. Hosted Auth/Realtime integration is a later check.
const db = new PGlite();
const rider = '30000000-0000-4000-8000-000000000001';
const driver = '30000000-0000-4000-8000-000000000002';
const stranger = '30000000-0000-4000-8000-000000000003';
const school = '10000000-0000-4000-8000-000000000001';
const market = '20000000-0000-4000-8000-000000000001';
const vehicle = '40000000-0000-4000-8000-000000000001';
const session = '50000000-0000-4000-8000-000000000001';

async function asUser<T>(user: string, sql: string, params: unknown[] = []) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec('set role authenticated');
  try { return (await db.query<T>(sql, params)).rows; }
  finally { await db.exec('reset role'); }
}
async function request(user = rider) {
  const [row] = await asUser<{ id: string }>(user, 'select public.create_ride_request($1,$2,$3,$4,$5,$6,$7,$8) id', [market, 'Front Campus', 'Downtown', 33.0801, -83.2321, 33.081, -83.23, 2]);
  return row.id;
}
async function offer(id: string) {
  const [row] = await asUser<{ id: string }>(driver, 'select public.submit_ride_offer($1,$2,$3) id', [id, vehicle, 750]);
  return row.id;
}
async function accept(id: string, user = rider) { return asUser<{ id: string }>(user, 'select public.accept_ride_offer($1) id', [id]); }

beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`);
  await db.exec(readFileSync('supabase/migrations/202610150001_foundation.sql', 'utf8'));
  await db.exec(readFileSync('supabase/seed.sql', 'utf8'));
});
beforeEach(async () => {
  await db.exec('truncate auth.users cascade');
  for (const [id, name] of [[rider, 'Rider'], [driver, 'Driver'], [stranger, 'Other rider']]) {
    await db.query('insert into auth.users values ($1)', [id]);
    await db.query('insert into public.profiles(id,display_name) values($1,$2)', [id, name]);
    await db.query("insert into public.student_verifications(user_id,school_id,method,status,expires_at) values($1,$2,'test','verified',now()+interval '1 day')", [id, school]);
  }
  await db.query("insert into public.driver_profiles(user_id,status,approved_until) values($1,'approved',now()+interval '1 day')", [driver]);
  for (const kind of ['identity','license','insurance','screening']) await db.query("insert into public.driver_checks(driver_id,check_type,status,expires_at) values($1,$2,'approved',now()+interval '1 day')", [driver, kind]);
  await db.query("insert into public.vehicles(id,driver_id,make,model,color,plate,passenger_capacity,status,approved_until) values($1,$2,'Test','Car','Blue','DEMO',4,'approved',now()+interval '1 day')", [vehicle, driver]);
  await db.query('insert into public.driver_sessions(id,driver_id,vehicle_id,market_id,available) values($1,$2,$3,$4,true)', [session, driver, vehicle, market]);
});
afterAll(async () => { await db.close(); });

describe('database booking and access boundaries', () => {
  it('books a verified student and snapshots server-calculated prices pending payment', async () => {
    const id = await request(); const oid = await offer(id); const [booked] = await accept(oid);
    const rows = await asUser<{ status: string; total_cents: number; fee_cents: number }>(rider, 'select status,total_cents,fee_cents from public.trips where id=$1', [booked.id]);
    expect(rows).toEqual([{ status: 'awaiting_payment', total_cents: 863, fee_cents: 113 }]);
    expect((await asUser(driver, 'select * from public.ride_requests')).length).toBe(1);
  });
  it('hides exact pickup and all other students’ bookings', async () => {
    const id = await request();
    expect(await asUser(driver, 'select * from public.ride_requests')).toEqual([]);
    const available = await asUser(driver, 'select * from public.available_ride_requests($1)', [session]);
    expect(available).toHaveLength(1);
    expect(available[0]).not.toHaveProperty('pickup_label');
    await accept(await offer(id));
    expect(await asUser(stranger, 'select * from public.trips')).toEqual([]);
    expect(await asUser(stranger, 'select * from public.ride_offers')).toEqual([]);
    expect(await asUser(stranger, 'select * from public.ride_requests')).toEqual([]);
  });
  it('rejects a different rider accepting an offer', async () => {
    const oid = await offer(await request());
    await expect(accept(oid, stranger)).rejects.toThrow('Request unavailable');
  });
  it('prevents duplicate acceptance and later price mutation', async () => {
    const id = await request(); const oid = await offer(id); await accept(oid);
    await expect(accept(oid)).rejects.toThrow('no longer available');
    await expect(offer(id)).rejects.toThrow('not open');
    expect((await db.query('select * from public.trips')).rows).toHaveLength(1);
  });
  it('enforces one active booking per driver and rolls back a conflicting acceptance', async () => {
    const first = await offer(await request()); const secondRequest = await request(stranger); const second = await offer(secondRequest);
    await accept(first);
    await expect(accept(second, stranger)).rejects.toThrow('one_active_trip_per_driver');
    const row = await db.query<{status:string}>('select status from public.ride_requests where id=$1', [secondRequest]);
    expect(row.rows[0].status).toBe('open');
  });
  it('rejects expired offers', async () => {
    const oid = await offer(await request());
    await db.query("update public.ride_offers set expires_at=now()-interval '1 minute' where id=$1", [oid]);
    await expect(accept(oid)).rejects.toThrow('no longer available');
  });
  it('rechecks driver screening at acceptance', async () => {
    const oid = await offer(await request());
    await db.exec("update public.driver_checks set expires_at=now()-interval '1 day' where check_type='insurance'");
    await expect(accept(oid)).rejects.toThrow('Eligibility has expired');
  });
  it('rejects stale driver availability and insufficient seats', async () => {
    const id = await request();
    await db.exec("update public.driver_sessions set last_heartbeat=now()-interval '3 minutes'");
    await expect(offer(id)).rejects.toThrow('not eligible');
    await db.exec('update public.driver_sessions set last_heartbeat=now(); update public.vehicles set passenger_capacity=1');
    await expect(offer(id)).rejects.toThrow('not eligible');
  });
  it('honors blocks at discovery and booking', async () => {
    const oid = await offer(await request());
    await asUser(rider, 'insert into public.user_blocks(blocker_id,blocked_id) values($1,$2)', [rider, driver]);
    expect(await asUser(driver, 'select * from public.available_ride_requests($1)', [session])).toEqual([]);
    await expect(accept(oid)).rejects.toThrow('Pairing unavailable');
  });
  it('denies client changes to approval, money, and trip state', async () => {
    await accept(await offer(await request()));
    await expect(asUser(driver, "update public.driver_profiles set approved_until=now()+interval '10 years'")).rejects.toThrow('permission denied');
    await expect(asUser(rider, 'update public.ride_offers set fare_cents=1')).rejects.toThrow('permission denied');
    await expect(asUser(rider, "update public.trips set status='completed'")).rejects.toThrow('permission denied');
  });
  it('requires current student eligibility and an in-market route', async () => {
    await db.query("update public.student_verifications set expires_at=now()-interval '1 day' where user_id=$1", [rider]);
    await expect(request()).rejects.toThrow('student verification required');
    await expect(asUser(stranger, 'select public.create_ride_request($1,$2,$3,$4,$5,$6,$7,$8)', [market, 'Front Campus', 'Far away', 33.08, -83.23, 40.7, -74, 2])).rejects.toThrow('active market');
  });
  it('denies anonymous booking RPC execution', async () => {
    await db.exec('set role anon');
    try { await expect(db.query('select public.accept_ride_offer($1)', ['00000000-0000-4000-8000-000000000001'])).rejects.toThrow('permission denied'); }
    finally { await db.exec('reset role'); }
  });
  it('hides and rejects requests when a market is paused', async () => {
    const oid = await offer(await request());
    await db.query("update public.markets set status='paused' where id=$1", [market]);
    try {
      expect(await asUser(driver, 'select * from public.available_ride_requests($1)', [session])).toEqual([]);
      await expect(accept(oid)).rejects.toThrow('Market unavailable');
    } finally {
      await db.query("update public.markets set status='pilot' where id=$1", [market]);
    }
  });
});
