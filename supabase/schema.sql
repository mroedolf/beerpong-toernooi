-- Schema for tournament sharing. Run this once in the Supabase SQL editor
-- (Dashboard → SQL Editor → New query → paste → Run) on a free project.
--
-- Security model: anyone with the link (the row id) can READ a tournament, but
-- writes only go through update_tournament(), which checks a secret owner_token
-- that only the creator holds. Direct table writes by the anon role are denied
-- by row-level security, so viewers can never change scores.

create extension if not exists pgcrypto;

create table if not exists public.tournaments (
  id          text primary key default encode(gen_random_bytes(8), 'hex'),
  data        jsonb not null,
  owner_token text not null default encode(gen_random_bytes(16), 'hex'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.tournaments enable row level security;

-- Public read by id (the share link). No insert/update/delete policy → the anon
-- role cannot write directly; it must use the RPCs below.
drop policy if exists "public read" on public.tournaments;
create policy "public read" on public.tournaments for select using (true);

-- Create a tournament and hand the creator its id + secret owner token.
create or replace function public.create_tournament(p_data jsonb)
returns table(id text, owner_token text)
language plpgsql security definer set search_path = public as $$
declare new_id text; new_token text;
begin
  insert into public.tournaments(data)
  values (p_data)
  returning tournaments.id, tournaments.owner_token into new_id, new_token;
  return query select new_id, new_token;
end; $$;

-- Update a tournament only when the owner token matches. Returns true on success.
create or replace function public.update_tournament(p_id text, p_token text, p_data jsonb)
returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.tournaments
     set data = p_data, updated_at = now()
   where id = p_id and owner_token = p_token;
  get diagnostics n = row_count;
  return n > 0;
end; $$;

grant execute on function public.create_tournament(jsonb) to anon;
grant execute on function public.update_tournament(text, text, jsonb) to anon;
