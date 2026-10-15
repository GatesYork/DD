-- Preserve historical additive-fee quotes. New quotes use whole-dollar per-person
-- fares and deduct the platform commission from the booking gross.
alter table public.ride_offers add column pricing_model text not null default 'legacy_additive' check (pricing_model in ('legacy_additive','commission'));
alter table public.ride_offers add column per_person_cents integer check (per_person_cents between 100 and 20000 and per_person_cents % 100 = 0);
alter table public.ride_offers add constraint ride_offers_commission_shape check (pricing_model <> 'commission' or (per_person_cents is not null and fee_cents <= fare_cents));
alter table public.ride_offers drop column total_cents;
alter table public.ride_offers add column total_cents integer generated always as (case when pricing_model='commission' then fare_cents else fare_cents+fee_cents end) stored;
alter table public.ride_offers add column driver_earnings_cents integer generated always as (case when pricing_model='commission' then fare_cents-fee_cents else fare_cents end) stored;
alter table public.ride_offers drop constraint ride_offers_fare_cents_check;
alter table public.ride_offers add constraint ride_offers_fare_cents_check check (fare_cents between 100 and 120000);
alter table public.trips add column pricing_model text not null default 'legacy_additive' check (pricing_model in ('legacy_additive','commission'));
alter table public.trips add column per_person_cents integer check (per_person_cents between 100 and 20000 and per_person_cents % 100 = 0);
alter table public.trips add constraint trips_commission_shape check (pricing_model <> 'commission' or (per_person_cents is not null and fee_cents <= fare_cents));
alter table public.trips drop column total_cents;
alter table public.trips add column total_cents integer generated always as (case when pricing_model='commission' then fare_cents else fare_cents+fee_cents end) stored;
alter table public.trips add column driver_earnings_cents integer generated always as (case when pricing_model='commission' then fare_cents-fee_cents else fare_cents end) stored;
alter table public.trips drop constraint trips_fare_cents_check;
alter table public.trips add constraint trips_fare_cents_check check (fare_cents between 100 and 120000);

create or replace function public.submit_ride_offer(p_request uuid,p_vehicle uuid,p_fare_cents integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare r public.ride_requests; result uuid; fee integer; begin
  if p_fare_cents is null or p_fare_cents < 100 or p_fare_cents > 20000 or p_fare_cents % 100 <> 0 then raise exception 'Use whole-dollar per-person fares'; end if;
  select * into r from public.ride_requests where id=p_request for update;
  if not found or r.status<>'open' or r.expires_at<=now() then raise exception 'Request is not open'; end if;
  if r.rider_id=auth.uid() or not private.is_student(r.rider_id) or not private.can_drive(auth.uid(),p_vehicle,r.market_id,r.passengers) then raise exception 'Driver is not eligible'; end if;
  if exists(select 1 from public.user_blocks b where (b.blocker_id=r.rider_id and b.blocked_id=auth.uid()) or (b.blocker_id=auth.uid() and b.blocked_id=r.rider_id)) then raise exception 'Pairing unavailable'; end if;
  select round(p_fare_cents::numeric*r.passengers*fee_basis_points/10000)::integer into fee from public.markets where id=r.market_id and status in ('pilot','active');
  if fee is null then raise exception 'Market unavailable'; end if;
  insert into public.ride_offers(request_id,driver_id,vehicle_id,fare_cents,fee_cents,expires_at,per_person_cents,pricing_model)
  values(p_request,auth.uid(),p_vehicle,p_fare_cents*r.passengers,fee,least(r.expires_at,now()+interval '5 minutes'),p_fare_cents,'commission')
  on conflict(request_id,driver_id) do update set vehicle_id=excluded.vehicle_id,fare_cents=excluded.fare_cents,fee_cents=excluded.fee_cents,expires_at=excluded.expires_at,status='pending',per_person_cents=excluded.per_person_cents,pricing_model=excluded.pricing_model
  returning id into result; return result;
end $$;
create or replace function public.accept_ride_offer(p_offer uuid) returns uuid language plpgsql security definer set search_path = '' as $$
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
  insert into public.trips(request_id,offer_id,rider_id,driver_id,vehicle_id,fare_cents,fee_cents,currency,per_person_cents,pricing_model)
  values(r.id,o.id,r.rider_id,o.driver_id,o.vehicle_id,o.fare_cents,o.fee_cents,o.currency,o.per_person_cents,o.pricing_model) returning id into result;
  update public.ride_requests set status='accepted' where id=r.id;
  update public.ride_offers set status=case when id=o.id then 'accepted' else 'withdrawn' end where request_id=r.id;
  insert into public.trip_events(trip_id,actor_id,event_type) values(result,auth.uid(),'offer_accepted_awaiting_payment');
  return result;
end $$;
