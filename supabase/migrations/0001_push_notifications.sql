-- Device push notifications + booking-status notification triggers.
--
-- Run this once against the project's Supabase database (SQL editor, or
-- `supabase db push` if the project is linked to the CLI). Safe to re-run:
-- every statement is idempotent (IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS).
--
-- Ownership after this migration:
--   - `listing_match` notifications: still fully owned by the recommendation-engine
--     service (insert + push send + push_sent). Untouched by this migration.
--   - every other notification type: owned end-to-end by Supabase — a DB trigger
--     inserts the `notifications` row, a second trigger fires the `send-push`
--     Edge Function, which sends the Expo push and stamps `push_sent`.

-- ── 1. Broaden the notifications.type check constraint ──────────────────────
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type = any (array[
    'booking_status'::text,
    'listing_match'::text,
    'booking_reminder'::text,
    'listing_reminder'::text,
    'announcement'::text,
    'message'::text
  ]));

-- ── 2. push_tokens: multi-device support, owned directly by the mobile app ──
-- (Previously written only by the recommendation-engine service via its
-- service-role key. The app now upserts its own token directly, so it needs
-- RLS policies scoped to the authenticated user.)
alter table public.push_tokens add column if not exists id uuid default gen_random_uuid();
alter table public.push_tokens add column if not exists platform text;
alter table public.push_tokens add column if not exists is_valid boolean not null default true;
alter table public.push_tokens add column if not exists last_used_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'push_tokens_pkey'
  ) then
    alter table public.push_tokens add constraint push_tokens_pkey primary key (id);
  end if;
end $$;

alter table public.push_tokens enable row level security;

drop policy if exists "push_tokens_select_own" on public.push_tokens;
create policy "push_tokens_select_own" on public.push_tokens
  for select using (auth.uid() = user_id);

drop policy if exists "push_tokens_insert_own" on public.push_tokens;
create policy "push_tokens_insert_own" on public.push_tokens
  for insert with check (auth.uid() = user_id);

drop policy if exists "push_tokens_update_own" on public.push_tokens;
create policy "push_tokens_update_own" on public.push_tokens
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "push_tokens_delete_own" on public.push_tokens;
create policy "push_tokens_delete_own" on public.push_tokens
  for delete using (auth.uid() = user_id);

-- ── 3. notification_preferences: per-user category toggles ─────────────────
create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  bookings boolean not null default true,
  reminders boolean not null default true,
  listings boolean not null default true,
  announcements boolean not null default true,
  push_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists "notification_preferences_select_own" on public.notification_preferences;
create policy "notification_preferences_select_own" on public.notification_preferences
  for select using (auth.uid() = user_id);

drop policy if exists "notification_preferences_upsert_own" on public.notification_preferences;
create policy "notification_preferences_upsert_own" on public.notification_preferences
  for insert with check (auth.uid() = user_id);

drop policy if exists "notification_preferences_update_own" on public.notification_preferences;
create policy "notification_preferences_update_own" on public.notification_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── 4. Booking lifecycle → in-app notification ──────────────────────────────
-- Fires regardless of which app (mobile, host-app, admin) changes the booking.
create or replace function public.notify_booking_submitted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing_title text;
begin
  select title into v_listing_title from public.listings where id = new.listing_id;

  -- Confirmation to the guest.
  insert into public.notifications (user_id, type, title, body, data)
  values (
    new.user_id,
    'booking_status',
    'Booking submitted',
    coalesce(v_listing_title, 'Your booking') || ' is pending host approval.',
    jsonb_build_object('bookingId', new.id, 'listingId', new.listing_id, 'listingType', new.listing_type, 'status', new.status)
  );

  -- Heads-up to the host.
  insert into public.notifications (user_id, type, title, body, data)
  values (
    new.host_id,
    'booking_status',
    'New booking request',
    coalesce(v_listing_title, 'A listing') || ' has a new booking request to review.',
    jsonb_build_object('bookingId', new.id, 'listingId', new.listing_id, 'listingType', new.listing_type, 'status', new.status)
  );

  return new;
end;
$$;

drop trigger if exists on_booking_submitted on public.bookings;
create trigger on_booking_submitted
  after insert on public.bookings
  for each row execute function public.notify_booking_submitted();

create or replace function public.notify_booking_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing_title text;
  v_title text;
  v_body text;
  v_recipient uuid;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  select title into v_listing_title from public.listings where id = new.listing_id;

  if new.status = 'confirmed' then
    v_recipient := new.user_id;
    v_title := 'Booking confirmed';
    v_body := 'Your booking for ' || coalesce(v_listing_title, 'your listing') || ' is confirmed.';
  elsif new.status = 'rejected' then
    v_recipient := new.user_id;
    v_title := 'Booking declined';
    v_body := 'Your booking request for ' || coalesce(v_listing_title, 'this listing') || ' was declined.';
  elsif new.status = 'completed' then
    v_recipient := new.user_id;
    v_title := 'Booking completed';
    v_body := 'Your booking for ' || coalesce(v_listing_title, 'this listing') || ' is complete. We hope you enjoyed it!';
  elsif new.status = 'cancelled_by_host' then
    v_recipient := new.user_id;
    v_title := 'Booking cancelled';
    v_body := 'The host cancelled your booking for ' || coalesce(v_listing_title, 'this listing') || '.';
  elsif new.status = 'cancelled_by_user' then
    v_recipient := new.host_id;
    v_title := 'Booking cancelled';
    v_body := 'A guest cancelled their booking for ' || coalesce(v_listing_title, 'your listing') || '.';
  else
    return new;
  end if;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_recipient,
    'booking_status',
    v_title,
    v_body,
    jsonb_build_object('bookingId', new.id, 'listingId', new.listing_id, 'listingType', new.listing_type, 'status', new.status)
  );

  return new;
end;
$$;

drop trigger if exists on_booking_status_change on public.bookings;
create trigger on_booking_status_change
  after update of status on public.bookings
  for each row execute function public.notify_booking_status_change();

-- ── 5. notifications insert → push Edge Function ────────────────────────────
-- Requires the `pg_net` extension (bundled with Supabase, usually already
-- available under the `extensions` schema).
create extension if not exists pg_net with schema extensions;

-- Two one-time settings this migration cannot set for you (they require
-- superuser / project-level config). Run once, replacing the placeholders,
-- from the SQL editor:
--
--   alter database postgres set app.settings.push_function_url =
--     'https://<your-project-ref>.supabase.co/functions/v1/send-push';
--   alter database postgres set app.settings.push_function_secret =
--     '<a long random string — set the same value as the send-push function''s WEBHOOK_SECRET secret>';
--
-- Then reconnect (new sessions pick up `alter database ... set` immediately;
-- existing ones need a fresh connection).

create or replace function public.trigger_send_push_notification()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url text;
  v_secret text;
begin
  -- listing_match is sent end-to-end by the recommendation-engine job already.
  if new.type = 'listing_match' then
    return new;
  end if;

  v_url := current_setting('app.settings.push_function_url', true);
  v_secret := current_setting('app.settings.push_function_secret', true);

  if v_url is null or v_url = '' then
    -- Not configured yet — leave push_sent false rather than failing the insert.
    return new;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', coalesce(v_secret, '')
    ),
    body := jsonb_build_object('record', to_jsonb(new))
  );

  return new;
end;
$$;

drop trigger if exists on_notification_insert_send_push on public.notifications;
create trigger on_notification_insert_send_push
  after insert on public.notifications
  for each row execute function public.trigger_send_push_notification();
