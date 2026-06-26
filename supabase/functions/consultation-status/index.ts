import { createClient } from "npm:@supabase/supabase-js@2";

// Read-only booking status for the /consultation/thanks page. Given a booking id (an unguessable
// uuid), returns ONLY its status (PENDING | COMPLETED | unknown) — no name/email/phone. Lets the
// thanks page show "Booking received" only when the payment actually completed.
//
// Deploy: supabase functions deploy consultation-status --no-verify-jwt --project-ref pjeqnlwzyhjvahbrgham
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-region",
};
const JSON_H = { "Content-Type": "application/json" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const respond = (b: any, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, ...JSON_H } });

  const url = new URL(req.url);
  let id = url.searchParams.get("b") ?? "";
  if (!id && req.method === "POST") { try { id = String((await req.json())?.bookingId ?? ""); } catch { /* ignore */ } }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return respond({ status: "unknown" });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data } = await admin.from("consultation_bookings").select("status").eq("id", id).maybeSingle();
  return respond({ status: data?.status ?? "unknown" });
});
