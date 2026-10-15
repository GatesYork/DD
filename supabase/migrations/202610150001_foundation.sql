-- Server-owned financial and eligibility fields are intentionally not writable by clients.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(display_name) between 1 and 80),
  avatar_path text, status text not null default 'active' check (status in ('active','suspended','closed')),
  created_at timestamptz not null default now()
);
create table public.schools (
  id uuid primary key default gen_random_uuid(), name text not null,
  email_domains text[] not null default '{}', verification_policy text not null default 'provider_review',
  created_at timestamptz not null default now()
);
create table public.markets (
  id uuid primary key default gen_random_uuid(), name text not null unique,
  timezone text not null default 'America/New_York', status text not null default 'planned' check (status in ('planned','pilot','active','paused')),
  center_lat double precision not null check (center_lat between -90 and 90),
  center_lng double precision not null check (center_lng between -180 and 180),
  radius_km numeric not null check (radius_km > 0 and radius_km <= 100),
  fee_basis_points integer not null default 1500 check (fee_basis_points between 0 and 10000),
  created_at timestamptz not null default now()
);
create table public.school_markets (
  school_id uuid references public.schools on delete cascade,
  market_id uuid references public.markets on delete cascade, primary key (school_id, market_id)
);
create table public.student_verifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles,
  school_id uuid not null references public.schools, method text not null,
  provider_reference text, status text not null check (status in ('pending','verified','rejected','expired')),
  expires_at timestamptz, created_at timestamptz not null default now(),
  check (status <> 'verified' or expires_at is not null)
);
create index student_verifications_user on public.student_verifications(user_id, status);
create table public.driver_profiles (
  user_id uuid primary key references public.profiles,
  status text not null default 'pending' check (status in ('pending','approved','rejected','suspended')),
  approved_until timestamptz, payment_account_reference text unique,
  payouts_enabled boolean not null default false, created_at timestamptz not null default now(),
  check (status <> 'approved' or approved_until is not null)
);
create table public.driver_checks (
  id uuid primary key default gen_random_uuid(), driver_id uuid not null references public.driver_profiles(user_id),
  check_type text not null check (check_type in ('identity','license','insurance','screening')),
  status text not null check (status in ('pending','approved','rejected','expired')),
  provider_reference text, expires_at timestamptz, created_at timestamptz not null default now()
);
create table public.vehicles (
  id uuid primary key default gen_random_uuid(), driver_id uuid not null references public.driver_profiles(user_id),
  make text not null, model text not null, color text not null, plate text not null,
  passenger_capacity integer not null check (passenger_capacity between 1 and 6),
  status text not null default 'pending' check (status in ('pending','approved','rejected','retired')),
  approved_until timestamptz, created_at timestamptz not null default now(), unique(id, driver_id),
  check (status <> 'approved' or approved_until is not null)
);
create table public.driver_sessions (
  id uuid primary key default gen_random_uuid(), driver_id uuid not null references public.driver_profiles(user_id),
  vehicle_id uuid not null, market_id uuid not null references public.markets,
  available boolean not null default false, last_heartbeat timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (vehicle_id, driver_id) references public.vehicles(id, driver_id)
);
create unique index one_online_session on public.driver_sessions(driver_id) where available;
create table public.ride_requests (
  id uuid primary key default gen_random_uuid(), rider_id uuid not null references public.profiles,
  market_id uuid not null references public.markets,
  pickup_label text not null check (length(pickup_label) between 3 and 160),
  destination_label text not null check (length(destination_label) between 3 and 160),
  pickup_lat double precision not null check (pickup_lat between -90 and 90),
  pickup_lng double precision not null check (pickup_lng between -180 and 180),
  destination_lat double precision not null check (destination_lat between -90 and 90),
  destination_lng double precision not null check (destination_lng between -180 and 180),
  passengers integer not null check (passengers between 1 and 6),
  status text not null default 'open' check (status in ('open','accepted','cancelled','expired')),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  created_at timestamptz not null default now(),
  unique (id,rider_id), check (lower(trim(pickup_label)) <> lower(trim(destination_label)))
);
create index requests_market on public.ride_requests(market_id,status,expires_at);
create table public.ride_offers (
  id uuid primary key default gen_random_uuid(), request_id uuid not null references public.ride_requests,
  driver_id uuid not null references public.driver_profiles(user_id), vehicle_id uuid not null,
  fare_cents integer not null check (fare_cents between 100 and 20000),
  fee_cents integer not null check (fee_cents >= 0),
  total_cents integer generated always as (fare_cents + fee_cents) stored,
  currency text not null default 'usd' check (currency = 'usd'),
  status text not null default 'pending' check (status in ('pending','accepted','withdrawn','expired')),
  expires_at timestamptz not null default (now() + interval '5 minutes'), created_at timestamptz not null default now(),
  foreign key (vehicle_id,driver_id) references public.vehicles(id,driver_id),
  unique (request_id,driver_id), unique(id,request_id,driver_id,vehicle_id)
);
create table public.trips (
  id uuid primary key default gen_random_uuid(), request_id uuid not null unique,
  offer_id uuid not null unique, rider_id uuid not null references public.profiles,
  driver_id uuid not null references public.driver_profiles(user_id), vehicle_id uuid not null,
  fare_cents integer not null check (fare_cents between 100 and 20000), fee_cents integer not null check (fee_cents >= 0),
  total_cents integer generated always as (fare_cents + fee_cents) stored,
  currency text not null default 'usd' check (currency = 'usd'),
  status text not null default 'awaiting_payment' check (status in ('awaiting_payment','confirmed','arriving','in_progress','completed','cancelled')),
  created_at timestamptz not null default now(), started_at timestamptz, completed_at timestamptz,
  check (rider_id <> driver_id),
  foreign key (request_id,rider_id) references public.ride_requests(id,rider_id),
  foreign key (offer_id,request_id,driver_id,vehicle_id) references public.ride_offers(id,request_id,driver_id,vehicle_id)
);
create unique index one_active_trip_per_driver on public.trips(driver_id) where status in ('awaiting_payment','confirmed','arriving','in_progress');
create unique index one_active_trip_per_rider on public.trips(rider_id) where status in ('awaiting_payment','confirmed','arriving','in_progress');
create table public.trip_events (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips,
  actor_id uuid references public.profiles, event_type text not null, created_at timestamptz not null default now()
);
create table public.driver_locations (
  session_id uuid primary key references public.driver_sessions on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180), updated_at timestamptz not null default now()
);
create table public.payments (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips,
  provider_reference text not null unique, amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency = 'usd'),
  status text not null check (status in ('pending','authorized','captured','failed','cancelled','partially_refunded','refunded')),
  created_at timestamptz not null default now()
);
create table public.refunds (
  id uuid primary key default gen_random_uuid(), payment_id uuid not null references public.payments,
  amount_cents integer not null check (amount_cents > 0), reason text not null, provider_reference text unique,
  status text not null check (status in ('pending','succeeded','failed')), created_at timestamptz not null default now()
);
create table public.driver_transfers (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips,
  driver_id uuid not null references public.driver_profiles(user_id), amount_cents integer not null check (amount_cents > 0),
  provider_reference text unique, status text not null check (status in ('pending','paid','failed','reversed')),
  created_at timestamptz not null default now()
);
create table public.payment_webhook_events (
  provider_event_id text primary key, status text not null check (status in ('received','processed','failed')),
  received_at timestamptz not null default now(), processed_at timestamptz
);
create table public.ratings (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips,
  author_id uuid not null references public.profiles, recipient_id uuid not null references public.profiles,
  score integer not null check (score between 1 and 5), feedback text check (length(feedback) <= 1000),
  created_at timestamptz not null default now(), unique(trip_id,author_id), check (author_id <> recipient_id)
);
create table public.favorite_drivers (
  rider_id uuid references public.profiles, driver_id uuid references public.driver_profiles(user_id),
  created_at timestamptz not null default now(), primary key(rider_id,driver_id), check(rider_id <> driver_id)
);
create table public.trip_messages (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips,
  sender_id uuid not null references public.profiles, body text not null check (length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create table public.reports (
  id uuid primary key default gen_random_uuid(), reporter_id uuid not null references public.profiles,
  subject_id uuid references public.profiles, trip_id uuid references public.trips, category text not null,
  description text not null check (length(description) between 1 and 4000),
  status text not null default 'open' check (status in ('open','reviewing','resolved')),
  created_at timestamptz not null default now()
);
create table public.user_blocks (
  blocker_id uuid references public.profiles, blocked_id uuid references public.profiles,
  created_at timestamptz not null default now(), primary key(blocker_id,blocked_id), check(blocker_id <> blocked_id)
);
create table public.push_tokens (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles,
  token text not null unique, platform text not null check(platform in ('ios','android','web')), created_at timestamptz not null default now()
);
create table public.admin_roles (
  user_id uuid references public.profiles, role text check(role in ('reviewer','support','admin')), primary key(user_id,role)
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles,
  action text not null, record_type text not null, record_id uuid, created_at timestamptz not null default now()
);

-- Deny by default. No client may write eligibility, prices, trip state, or finance rows directly.
do $$ declare item record; begin
  for item in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security',item.tablename);
    execute format('revoke all on public.%I from anon, authenticated',item.tablename);
    execute format('grant select on public.%I to authenticated',item.tablename);
  end loop;
end $$;
create policy own_profile on public.profiles for select to authenticated using(id = auth.uid());
create policy school_directory on public.schools for select to authenticated using(true);
create policy market_directory on public.markets for select to authenticated using(true);
create policy school_market_directory on public.school_markets for select to authenticated using(true);
create policy own_verification on public.student_verifications for select to authenticated using(user_id = auth.uid());
create policy own_driver_profile on public.driver_profiles for select to authenticated using(user_id = auth.uid());
create policy own_driver_checks on public.driver_checks for select to authenticated using(driver_id = auth.uid());
create policy own_vehicle on public.vehicles for select to authenticated using(driver_id = auth.uid());
create policy own_sessions on public.driver_sessions for select to authenticated using(driver_id = auth.uid());
create policy participant_trip on public.trips for select to authenticated using(auth.uid() in (rider_id,driver_id));
create policy own_request on public.ride_requests for select to authenticated using(rider_id = auth.uid() or exists(select 1 from public.trips t where t.request_id = ride_requests.id and t.driver_id = auth.uid()));
create policy own_offer on public.ride_offers for select to authenticated using(driver_id = auth.uid() or exists(select 1 from public.ride_requests r where r.id = request_id and r.rider_id = auth.uid()));
create policy participant_events on public.trip_events for select to authenticated using(exists(select 1 from public.trips t where t.id = trip_id));
create policy own_payment on public.payments for select to authenticated using(exists(select 1 from public.trips t where t.id = trip_id and t.rider_id = auth.uid()));
create policy own_refund on public.refunds for select to authenticated using(exists(select 1 from public.payments p where p.id = payment_id));
create policy own_transfer on public.driver_transfers for select to authenticated using(driver_id = auth.uid());
create policy participant_rating on public.ratings for select to authenticated using(auth.uid() in (author_id,recipient_id));
create policy own_favorites on public.favorite_drivers for all to authenticated using(rider_id = auth.uid()) with check(rider_id = auth.uid());
grant insert,delete on public.favorite_drivers to authenticated;
create policy participant_messages on public.trip_messages for select to authenticated using(exists(select 1 from public.trips t where t.id = trip_id));
create policy own_reports on public.reports for select to authenticated using(reporter_id = auth.uid());
create policy own_blocks on public.user_blocks for all to authenticated using(blocker_id = auth.uid()) with check(blocker_id = auth.uid());
grant insert,delete on public.user_blocks to authenticated;
create policy own_push_tokens on public.push_tokens for all to authenticated using(user_id = auth.uid()) with check(user_id = auth.uid());
grant insert,update,delete on public.push_tokens to authenticated;
-- Location, staff, audit, and webhook tables have no client policies yet; service-only access.

create schema if not exists private;
revoke all on schema private from public;
create function private.is_student(p_user uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles p join public.student_verifications s on s.user_id=p.id where p.id=p_user and p.status='active' and s.status='verified' and s.expires_at>now());
$$;
create function private.can_drive(p_driver uuid,p_vehicle uuid,p_market uuid,p_seats integer) returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_student(p_driver) and exists(
    select 1 from public.driver_profiles d join public.vehicles v on v.driver_id=d.user_id
    join public.driver_sessions s on s.driver_id=d.user_id and s.vehicle_id=v.id
    where d.user_id=p_driver and d.status='approved' and d.approved_until>now()
    and v.id=p_vehicle and v.status='approved' and v.approved_until>now() and v.passenger_capacity>=p_seats
    and s.market_id=p_market and s.available and s.last_heartbeat>now()-interval '2 minutes'
  ) and not exists(
    select kind from unnest(array['identity','license','insurance','screening']) kind
    where not exists(select 1 from public.driver_checks c where c.driver_id=p_driver and c.check_type=kind and c.status='approved' and c.expires_at>now())
  );
$$;
create function private.in_market(p_market uuid,p_lat double precision,p_lng double precision) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.markets m where m.id=p_market and m.status in ('pilot','active')
    and 6371 * acos(least(1.0,greatest(-1.0,sin(radians(m.center_lat))*sin(radians(p_lat))+cos(radians(m.center_lat))*cos(radians(p_lat))*cos(radians(p_lng-m.center_lng))))) <= m.radius_km);
$$;
create function public.create_ride_request(p_market uuid,p_pickup text,p_destination text,p_pickup_lat double precision,p_pickup_lng double precision,p_destination_lat double precision,p_destination_lng double precision,p_passengers integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid; begin
  if not private.is_student(auth.uid()) then raise exception 'Current student verification required'; end if;
  if not private.in_market(p_market,p_pickup_lat,p_pickup_lng) or not private.in_market(p_market,p_destination_lat,p_destination_lng) then raise exception 'Pickup and destination must be in an active market'; end if;
  insert into public.ride_requests(rider_id,market_id,pickup_label,destination_label,pickup_lat,pickup_lng,destination_lat,destination_lng,passengers)
  values(auth.uid(),p_market,trim(p_pickup),trim(p_destination),p_pickup_lat,p_pickup_lng,p_destination_lat,p_destination_lng,p_passengers) returning id into result;
  return result;
end $$;
-- Matching reveals approximate coordinates only. Exact labels and coordinates remain private until booking.
create function public.available_ride_requests(p_session uuid)
returns table(request_id uuid,passengers integer,pickup_lat_approx numeric,pickup_lng_approx numeric,destination_lat_approx numeric,destination_lng_approx numeric,expires_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.id,r.passengers,round(r.pickup_lat::numeric,2),round(r.pickup_lng::numeric,2),round(r.destination_lat::numeric,2),round(r.destination_lng::numeric,2),r.expires_at
  from public.ride_requests r join public.driver_sessions s on s.market_id=r.market_id
  where s.id=p_session and s.driver_id=auth.uid() and r.rider_id<>auth.uid() and r.status='open' and r.expires_at>now()
  and exists(select 1 from public.markets m where m.id=r.market_id and m.status in ('pilot','active'))
  and private.is_student(r.rider_id) and private.can_drive(auth.uid(),s.vehicle_id,r.market_id,r.passengers)
  and not exists(select 1 from public.user_blocks b where (b.blocker_id=r.rider_id and b.blocked_id=auth.uid()) or (b.blocker_id=auth.uid() and b.blocked_id=r.rider_id));
$$;
create function public.submit_ride_offer(p_request uuid,p_vehicle uuid,p_fare_cents integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare r public.ride_requests; result uuid; fee integer; begin
  select * into r from public.ride_requests where id=p_request for update;
  if not found or r.status<>'open' or r.expires_at<=now() then raise exception 'Request is not open'; end if;
  if r.rider_id=auth.uid() or not private.is_student(r.rider_id) or not private.can_drive(auth.uid(),p_vehicle,r.market_id,r.passengers) then raise exception 'Driver is not eligible'; end if;
  if exists(select 1 from public.user_blocks b where (b.blocker_id=r.rider_id and b.blocked_id=auth.uid()) or (b.blocker_id=auth.uid() and b.blocked_id=r.rider_id)) then raise exception 'Pairing unavailable'; end if;
  select round(p_fare_cents::numeric*fee_basis_points/10000)::integer into fee from public.markets where id=r.market_id and status in ('pilot','active');
  if fee is null then raise exception 'Market unavailable'; end if;
  insert into public.ride_offers(request_id,driver_id,vehicle_id,fare_cents,fee_cents,expires_at)
  values(p_request,auth.uid(),p_vehicle,p_fare_cents,fee,least(r.expires_at,now()+interval '5 minutes'))
  on conflict(request_id,driver_id) do update set vehicle_id=excluded.vehicle_id,fare_cents=excluded.fare_cents,fee_cents=excluded.fee_cents,expires_at=excluded.expires_at,status='pending'
  returning id into result; return result;
end $$;
create function public.accept_ride_offer(p_offer uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare r public.ride_requests; o public.ride_offers; result uuid; request_uuid uuid; begin
  select request_id into request_uuid from public.ride_offers where id=p_offer;
  -- All offer mutations lock the request first, preventing acceptance/update races.
  select * into r from public.ride_requests where id=request_uuid for update;
  if not found or r.rider_id<>auth.uid() or auth.uid() is null then raise exception 'Request unavailable'; end if;
  select * into o from public.ride_offers where id=p_offer for update;
  if r.status<>'open' or r.expires_at<=now() or o.status<>'pending' or o.expires_at<=now() then raise exception 'Offer is no longer available'; end if;
  if not private.is_student(auth.uid()) or not private.can_drive(o.driver_id,o.vehicle_id,r.market_id,r.passengers) then raise exception 'Eligibility has expired'; end if;
  if not exists(select 1 from public.markets where id=r.market_id and status in ('pilot','active')) then raise exception 'Market unavailable'; end if;
  if exists(select 1 from public.user_blocks b where (b.blocker_id=r.rider_id and b.blocked_id=o.driver_id) or (b.blocker_id=o.driver_id and b.blocked_id=r.rider_id)) then raise exception 'Pairing unavailable'; end if;
  insert into public.trips(request_id,offer_id,rider_id,driver_id,vehicle_id,fare_cents,fee_cents,currency)
  values(r.id,o.id,r.rider_id,o.driver_id,o.vehicle_id,o.fare_cents,o.fee_cents,o.currency) returning id into result;
  update public.ride_requests set status='accepted' where id=r.id;
  update public.ride_offers set status=case when id=o.id then 'accepted' else 'withdrawn' end where request_id=r.id;
  insert into public.trip_events(trip_id,actor_id,event_type) values(result,auth.uid(),'offer_accepted_awaiting_payment');
  return result;
end $$;
-- Functions default to PUBLIC execution in PostgreSQL; remove that default explicitly.
revoke all on all functions in schema private from public,anon,authenticated;
revoke all on function public.create_ride_request(uuid,text,text,double precision,double precision,double precision,double precision,integer) from public,anon;
revoke all on function public.available_ride_requests(uuid) from public,anon;
revoke all on function public.submit_ride_offer(uuid,uuid,integer) from public,anon;
revoke all on function public.accept_ride_offer(uuid) from public,anon;
grant execute on function public.create_ride_request(uuid,text,text,double precision,double precision,double precision,double precision,integer) to authenticated;
grant execute on function public.available_ride_requests(uuid) to authenticated;
grant execute on function public.submit_ride_offer(uuid,uuid,integer) to authenticated;
grant execute on function public.accept_ride_offer(uuid) to authenticated;
