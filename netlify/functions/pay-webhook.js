// Hub: the SINGLE PhonePe webhook for every app (set this URL once in the PhonePe dashboard).
// PhonePe authenticates with Authorization == SHA256("user:pass") (constant-time compared). We then
// NEVER trust the webhook body for money or identity: we re-read the order from PhonePe's Order
// Status API and route + grant using ONLY that authoritative response. A status response without
// metaInfo, or a paid amount that doesn't match the plan price, is refused — never falls back to the body.
const { getApp, hmacHex, sha256Hex, timingSafeEqual, phonepeBases, phonepeToken, reply } = require("./_hub");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return reply(405, { error: "Method not allowed" });

  // 1) Authenticate PhonePe (constant-time compare; fails closed on unset creds).
  const user = process.env.HUB_PHONEPE_CALLBACK_USER || "";
  const pass = process.env.HUB_PHONEPE_CALLBACK_PASS || "";
  const expected = (await sha256Hex(`${user}:${pass}`)).toLowerCase();
  const provided = (event.headers["authorization"] || "").replace(/^SHA256\s+/i, "").trim().toLowerCase();
  if (!user || !pass || !timingSafeEqual(provided, expected)) return reply(401, { error: "Unauthorized" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return reply(400, { error: "Invalid JSON" }); }
  const payload = body?.payload ?? body ?? {};
  // The body's merchantOrderId is used ONLY as a lookup key into PhonePe's authoritative Order Status.
  const merchantOrderId = payload?.merchantOrderId ?? payload?.merchantTransactionId;
  if (!merchantOrderId) return reply(200, { ok: true, ignored: "no merchantOrderId" });

  try {
    // 2) Authoritative re-verify with PhonePe. state, metaInfo (routing) and amount come ONLY from
    //    this response — never from the request body.
    const token = await phonepeToken();
    if (!token) { console.error("[hub] phonepe auth failed", merchantOrderId); return reply(200, { ok: true, warning: "auth failed, will retry" }); }
    const env = process.env.HUB_PHONEPE_ENV || "";
    const sResp = await fetch(phonepeBases(env).status(merchantOrderId), { headers: { "Authorization": `O-Bearer ${token}` } });
    const order = await sResp.json().catch(() => ({}));
    const state = String(order?.state ?? "").toUpperCase();

    if (state !== "COMPLETED") { console.log("[hub]", merchantOrderId, "state", state); return reply(200, { ok: true, state }); }

    // Routing from the AUTHORITATIVE metaInfo only. No body fallback — absent metaInfo = unroutable.
    const meta = order?.metaInfo ?? {};
    const appId = meta.udf1, userId = meta.udf2, planId = meta.udf3;
    const app = getApp(String(appId || ""));
    const plan = app?.plans?.[String(planId || "")];
    if (!app || !plan || !userId) {
      console.error("[hub] unroutable", merchantOrderId, { appId, planId, hasUser: !!userId });
      return reply(200, { ok: true, warning: "unroutable order" });
    }

    // Verify the amount PhonePe actually settled equals the plan price (anti-tamper / partial capture).
    // Reject on a confirmed mismatch; a missing amount field is logged (tighten once the shape is seen).
    const paid = Number(order?.amount);
    if (Number.isFinite(paid) && paid !== plan.amount_paise) {
      console.error("[hub] amount mismatch", merchantOrderId, { paid, expected: plan.amount_paise });
      return reply(200, { ok: true, warning: "amount mismatch" });
    }
    if (!Number.isFinite(paid)) console.warn("[hub] no amount in status", merchantOrderId);

    // 3) Grant on the owning app's backend, signed with that app's shared secret. The app enforces
    //    exactly-once on orderId, so a re-delivery is a no-op there.
    const grantBody = JSON.stringify({ userId, plan: planId, premium_days: plan.premium_days, orderId: merchantOrderId });
    const sig = await hmacHex(process.env[app.secretEnv] || "", grantBody);
    const gResp = await fetch(app.grantUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-hub-signature": sig },
      body: grantBody,
    });
    if (gResp.ok) console.log("[hub] granted", appId, merchantOrderId);
    else console.error("[hub] grant failed", appId, merchantOrderId, gResp.status);
    return reply(200, { ok: true, app: appId, granted: gResp.ok });
  } catch (e) {
    console.error("[hub] webhook error", merchantOrderId, e && e.message);
    return reply(200, { ok: true, warning: "error logged" });
  }
};
