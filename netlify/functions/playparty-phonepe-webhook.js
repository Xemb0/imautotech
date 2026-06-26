// PlayParty premium — PhonePe webhook, hosted on imautotech.in (the approved merchant domain).
//
// PhonePe POSTs the payment result here (this URL goes in the PhonePe dashboard webhook config).
// We forward it verbatim — raw body + the Authorization header — to PlayParty's Supabase callback,
// which verifies PhonePe's SHA256(username:password) auth and flips user_profiles.is_premium.
// No secrets live here: this function only proxies, Supabase does the verification + the grant.
const SUPABASE_CALLBACK = "https://xjkdesdrdsudtkvnfkdq.supabase.co/functions/v1/phonepe-callback";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  try {
    const resp = await fetch(SUPABASE_CALLBACK, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Netlify lowercases header keys. Pass PhonePe's auth header through UNCHANGED so the
        // SHA256(user:pass) check on the Supabase side still matches.
        "Authorization": event.headers["authorization"] || "",
      },
      body: event.body || "{}",
    });
    const text = await resp.text();
    return { statusCode: resp.status, headers: { "Content-Type": "application/json" }, body: text };
  } catch (e) {
    // Ack 200 so PhonePe doesn't retry-storm on a transient blip; premium is idempotent on retry.
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, warning: "forward failed, logged" }),
    };
  }
};
