// Hub: create a PhonePe order for any registered app. Called SERVER-TO-SERVER by the app's backend
// (which holds the app's shared secret and signs the body) — never directly by a browser, since the
// signature can't live client-side. Returns a PhonePe hosted-checkout URL.
//
// POST  body: { app, plan, userId, returnUrl? }   header: x-hub-signature = HMAC(body, app secret)
const { getApp, hmacHex, timingSafeEqual, phonepeBases, phonepeToken, reply } = require("./_hub");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return reply(405, { error: "Method not allowed" });

  const raw = event.body || "{}";
  let body;
  try { body = JSON.parse(raw); } catch { return reply(400, { error: "Invalid JSON" }); }

  const app = getApp(String(body.app || ""));
  if (!app) return reply(404, { error: "Unknown app" });

  // Authenticate the calling app: x-hub-signature must be HMAC(rawBody, that app's shared secret).
  const secret = process.env[app.secretEnv];
  if (!secret) return reply(500, { error: "App secret not configured" });
  const provided = (event.headers["x-hub-signature"] || "").toLowerCase();
  const expected = (await hmacHex(secret, raw)).toLowerCase();
  if (!timingSafeEqual(provided, expected)) return reply(401, { error: "Bad signature" });

  const plan = app.plans[String(body.plan || "")];
  if (!plan) return reply(400, { error: "Unknown plan" });
  const userId = String(body.userId || "");
  if (!userId) return reply(400, { error: "Missing userId" });

  const env = process.env.HUB_PHONEPE_ENV || "PROD";
  if (!process.env.HUB_PHONEPE_CLIENT_ID || !process.env.HUB_PHONEPE_CLIENT_SECRET) {
    return reply(500, { error: "PhonePe credentials not configured" });
  }

  try {
    const token = await phonepeToken();
    if (!token) return reply(502, { error: "PhonePe auth failed", env });

    // app + userId + plan are stamped into metaInfo so the webhook can route the grant with no DB.
    const merchantOrderId = `${body.app}-${userId.slice(0, 8)}-${Date.now()}`;
    const resp = await fetch(phonepeBases(env).pay, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `O-Bearer ${token}` },
      body: JSON.stringify({
        merchantOrderId,
        amount: plan.amount_paise,
        expireAfter: 1200,
        metaInfo: { udf1: body.app, udf2: userId, udf3: body.plan },
        paymentFlow: {
          type: "PG_CHECKOUT",
          message: `${body.app} premium`,
          merchantUrls: { redirectUrl: String(body.returnUrl || app.returnUrl) },
        },
      }),
    });
    const j = await resp.json().catch(() => ({}));
    if (!j?.redirectUrl) return reply(502, { error: "PhonePe order failed", detail: j });
    return reply(200, { ok: true, merchantOrderId, redirectUrl: j.redirectUrl, orderId: j.orderId ?? null });
  } catch (e) {
    return reply(500, { error: String((e && e.message) || e) });
  }
};
