// Supabase Edge Function: send-push
//
// Invoked by the `on_notification_insert_send_push` DB trigger (see
// supabase/migrations/0001_push_notifications.sql) whenever a row is inserted
// into `public.notifications` whose type isn't `listing_match` (that type is
// owned end-to-end by the recommendation-engine service).
//
// Responsibilities:
//   1. Verify the request actually came from our own DB trigger (shared secret).
//   2. Respect the recipient's notification_preferences for this type.
//   3. Look up their registered devices and send an Expo push to each.
//   4. Deactivate any token Expo reports as no longer registered.
//   5. Stamp notifications.push_sent = true so it's never retried.
//
// Deploy with:
//   supabase functions deploy send-push
//   supabase secrets set WEBHOOK_SECRET=<same value as app.settings.push_function_secret>
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically to
// every Edge Function by the Supabase runtime — never hardcode them here.)

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
};

// Maps a notification's `type` column to the preference category that gates it.
const PREFERENCE_CATEGORY: Record<string, "bookings" | "reminders" | "listings" | "announcements"> = {
  booking_status: "bookings",
  booking_reminder: "reminders",
  listing_reminder: "reminders",
  announcement: "announcements",
  message: "announcements",
};

async function markPushSent(id: string) {
  await supabase.from("notifications").update({ push_sent: true }).eq("id", id);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!WEBHOOK_SECRET || req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  let record: NotificationRow;
  try {
    const payload = await req.json();
    record = payload.record;
    if (!record?.id || !record?.user_id) throw new Error("missing record");
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  try {
    // 1. Respect the recipient's preferences (default to sending if the row
    // doesn't exist yet — a user who never opened settings hasn't opted out).
    const category = PREFERENCE_CATEGORY[record.type];
    if (category) {
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("push_enabled, bookings, reminders, listings, announcements")
        .eq("user_id", record.user_id)
        .maybeSingle();

      if (prefs && (prefs.push_enabled === false || prefs[category] === false)) {
        await markPushSent(record.id);
        return new Response(JSON.stringify({ skipped: "preference_disabled" }), { status: 200 });
      }
    }

    // 2. Look up this user's active devices.
    const { data: tokens, error: tokensErr } = await supabase
      .from("push_tokens")
      .select("id, expo_push_token")
      .eq("user_id", record.user_id)
      .eq("is_valid", true);

    if (tokensErr) throw tokensErr;

    if (!tokens || tokens.length === 0) {
      await markPushSent(record.id);
      return new Response(JSON.stringify({ skipped: "no_devices" }), { status: 200 });
    }

    // 3. Send to every device in one batched Expo request.
    const messages = tokens.map((t) => ({
      to: t.expo_push_token,
      title: record.title,
      body: record.body ?? undefined,
      data: { ...(record.data ?? {}), notificationId: record.id, type: record.type },
      sound: "default",
    }));

    const expoRes = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
    const expoJson = await expoRes.json();
    const tickets: Array<{ status: string; details?: { error?: string } }> = expoJson?.data ?? [];

    // 4. Deactivate tokens Expo says are dead, so future sends skip them.
    const deadTokenIds: string[] = [];
    tickets.forEach((ticket, i) => {
      if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
        deadTokenIds.push(tokens[i].id);
      }
    });
    if (deadTokenIds.length > 0) {
      await supabase.from("push_tokens").update({ is_valid: false }).in("id", deadTokenIds);
    }

    await markPushSent(record.id);
    return new Response(JSON.stringify({ sent: messages.length - deadTokenIds.length }), { status: 200 });
  } catch (err) {
    console.error("send-push failed:", err);
    // Still stamp push_sent so a permanent failure doesn't get retried forever
    // by a future manual re-trigger of the same row.
    await markPushSent(record.id).catch(() => undefined);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
