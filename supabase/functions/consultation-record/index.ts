import { createClient } from "npm:@supabase/supabase-js@2";

// imautotech.in consultancy — the payment HUB calls this (signed) when PhonePe confirms a paid
// booking. We verify the HMAC signature, then flip the matching consultation_bookings row to
// COMPLETED. Idempotent: a re-delivered webhook for an already-completed booking is a no-op.
//
// Deploy:  supabase functions deploy consultation-record --no-verify-jwt --project-ref pjeqnlwzyhjvahbrgham
// Secret:  HUB_SECRET_CONSULTATION (must equal the hub's HUB_SECRET_CONSULTATION)
const JSON_H = { "Content-Type": "application/json" };

async function hmacHex(secret: string, raw: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: JSON_H });

  const raw = await req.text();
  const secret = Deno.env.get("HUB_SECRET_CONSULTATION") ?? "";
  const provided = (req.headers.get("x-hub-signature") ?? "").toLowerCase();
  const expected = (await hmacHex(secret, raw)).toLowerCase();
  if (!secret || !timingSafeEqual(provided, expected)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: JSON_H });
  }

  let b: any;
  try { b = JSON.parse(raw); } catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: JSON_H }); }
  const bookingId = String(b.userId ?? "");
  const orderId = String(b.orderId ?? "");
  if (!bookingId) return new Response(JSON.stringify({ error: "Missing booking id" }), { status: 400, headers: JSON_H });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: bk } = await admin.from("consultation_bookings").select("status").eq("id", bookingId).maybeSingle();
  if (!bk) return new Response(JSON.stringify({ ok: true, ignored: "unknown booking" }), { status: 200, headers: JSON_H });
  if (bk.status === "COMPLETED") return new Response(JSON.stringify({ ok: true, deduped: true }), { status: 200, headers: JSON_H });

  const { error } = await admin.from("consultation_bookings")
    .update({ status: "COMPLETED", merchant_order_id: orderId || undefined, updated_at: new Date().toISOString() })
    .eq("id", bookingId);
  if (error) {
    console.error("consultation-record update error:", error.message);
    return new Response(JSON.stringify({ ok: false, error: "db error logged" }), { status: 200, headers: JSON_H });
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: JSON_H });
});
