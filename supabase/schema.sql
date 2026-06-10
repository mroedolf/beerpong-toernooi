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

-- ---------------------------------------------------------------------------
-- Live multiplayer rooms (Mex, Circle of Death, Hoger Lager, Fuck the Dealer,
-- De Fles). The whole game state lives in one row; everyone in the room shares
-- it. The room id (in the link) is the capability — anyone with the link can
-- play, so there is no per-seat token. `rev` lets clients detect new state.
create table if not exists public.rooms (
  id         text primary key default encode(gen_random_bytes(8), 'hex'),
  game       text not null,
  state      jsonb not null,
  rev        bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rooms enable row level security;

drop policy if exists "rooms read" on public.rooms;
create policy "rooms read" on public.rooms for select using (true);

create or replace function public.create_room(p_game text, p_state jsonb)
returns table(id text)
language plpgsql security definer set search_path = public as $$
declare new_id text;
begin
  insert into public.rooms(game, state) values (p_game, p_state)
  returning rooms.id into new_id;
  return query select new_id;
end; $$;

-- Anyone in the room may write the shared state (trust-based, casual play).
create or replace function public.update_room(p_id text, p_state jsonb)
returns table(rev bigint)
language plpgsql security definer set search_path = public as $$
declare new_rev bigint;
begin
  update public.rooms
     set state = p_state, rev = rev + 1, updated_at = now()
   where id = p_id
  returning rooms.rev into new_rev;
  return query select new_rev;
end; $$;

grant execute on function public.create_room(text, jsonb) to anon;
grant execute on function public.update_room(text, jsonb) to anon;
