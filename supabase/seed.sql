-- Fictional pilot configuration only. No user accounts, credentials, or identity documents.
insert into public.schools(id,name,email_domains) values ('10000000-0000-4000-8000-000000000001','Georgia College & State University',array['bobcats.gcsu.edu']) on conflict(id) do nothing;
insert into public.markets(id,name,center_lat,center_lng,radius_km,status) values ('20000000-0000-4000-8000-000000000001','Milledgeville',33.0801,-83.2321,15,'pilot') on conflict(id) do nothing;
insert into public.school_markets values ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001') on conflict do nothing;
