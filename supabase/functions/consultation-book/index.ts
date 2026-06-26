import { createClient } from "npm:@supabase/supabase-js@2";

// imautotech.in consultancy booking → payment. The booking form (pricing.html) POSTs the visitor's
// name/email/phone here. We record a PENDING booking, then ask the imautotech.in payment HUB to create
// a PhonePe order (the hub holds the PhonePe credentials) and hand back its hosted-checkout URL. The
// amount is FIXED here server-side (₹1,999/hour) so it can't be tampered from the browser. On payment,
// the hub's webhook calls consultation-record to flip this booking to COMPLETED.
//
// Deploy:  supabase functions deploy consultation-book --no-verify-jwt --project-ref pjeqnlwzyhjvahbrgham
// Secrets: HUB_SECRET_CONSULTATION (signs the hub call), HUB_CREATE_URL (default https://imautotech.in/pay/create)
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-region",
};
const JSON_H = { "Content-Type": "application/json" };
// Real consultancy offerings (paise) — must stay in sync with the hub registry (_hub.js).
const PLANS: Record<string, number> = {
  hour: 199900, // ₹1,999 — 1-on-1 consultancy, per hour
  quick: 900,   // ₹9 — 5-minute intro call
};

async function hmacHex(secret: string, raw: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const respond = (b: any, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, ...JSON_H } });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);

  let body: any;
  try { body = await req.json(); } catch { body = {}; }
  const name = String(body?.name ?? "").trim().slice(0, 120);
  const email = String(body?.email ?? "").trim().slice(0, 160);
  const phone = String(body?.phone ?? "").trim().slice(0, 32);
  const plan = body?.plan === "quick" ? "quick" : "hour"; // amount is fixed server-side per plan
  const amountPaise = PLANS[plan];
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return respond({ error: "Please enter your name and a valid email." }, 400);
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: booking, error } = await admin.from("consultation_bookings")
    .insert({ name, email, phone, amount_paise: amountPaise, status: "PENDING" })
    .select("id").single();
  if (error || !booking) return respond({ error: "Could not start your booking. Please try again." }, 500);

  const hubUrl = Deno.env.get("HUB_CREATE_URL") ?? "https://imautotech.in/pay/create";
  const secret = Deno.env.get("HUB_SECRET_CONSULTATION") ?? "";
  if (!secret) return respond({ error: "Payments are not configured yet." }, 500);

  // userId = the booking id, so the hub's webhook can map the payment back to THIS booking.
  // returnUrl carries the booking id so the thanks page can show the REAL status (paid vs cancelled).
  const returnUrl = `https://imautotech.in/consultation/thanks?b=${booking.id}`;
  const hubBody = JSON.stringify({ app: "consultation", plan, userId: booking.id, returnUrl });
  const sig = await hmacHex(secret, hubBody);
  try {
    const resp = await fetch(hubUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-hub-signature": sig },
      body: hubBody,
    });
    const j = await resp.json().catch(() => ({}));
    if (!j?.redirectUrl) return respond({ error: "Couldn't start the payment. Please try again." }, 502);
    await admin.from("consultation_bookings")
      .update({ merchant_order_id: j.merchantOrderId ?? null, updated_at: new Date().toISOString() })
      .eq("id", booking.id);
    return respond({ ok: true, redirectUrl: j.redirectUrl });
  } catch (_e) {
    return respond({ error: "Couldn't reach the payment service. Please try again." }, 500);
  }
});
