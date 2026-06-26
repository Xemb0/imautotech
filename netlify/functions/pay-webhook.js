// Hub: the SINGLE PhonePe webhook for every app (set this URL once in the PhonePe dashboard).
// PhonePe authenticates with Authorization == SHA256("user:pass"). We then NEVER trust the webhook
// body for money decisions — we re-read the order from PhonePe's Order Status API (authoritative
// state + the metaInfo we stamped at create time), and on COMPLETED we call the owning app's grant
// endpoint (signed with that app's shared secret) to unlock premium.
const { getApp, hmacHex, sha256Hex, phonepeBases, phonepeToken, reply } = require("./_hub");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return reply(405, { error: "Method not allowed" });

  // 1) Authenticate PhonePe.
  const user = process.env.HUB_PHONEPE_CALLBACK_USER || "";
  const pass = process.env.HUB_PHONEPE_CALLBACK_PASS || "";
  const expected = (await sha256Hex(`${user}:${pass}`)).toLowerCase();
  const provided = (event.headers["authorization"] || "").replace(/^SHA256\s+/i, "").trim().toLowerCase();
  if (!user || !pass || provided !== expected) return reply(401, { error: "Unauthorized" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return reply(400, { error: "Invalid JSON" }); }
  const payload = body?.payload ?? body ?? {};
  const merchantOrderId = payload?.merchantOrderId ?? payload?.merchantTransactionId;
  if (!merchantOrderId) return reply(200, { ok: true, ignored: "no merchantOrderId" });

  try {
    // 2) Re-verify with PhonePe: Order Status → authoritative state + metaInfo (don't trust the body).
    const token = await phonepeToken();
    if (!token) return reply(200, { ok: true, warning: "auth failed, will retry" });
    const env = process.env.HUB_PHONEPE_ENV || "PROD";
    const sResp = await fetch(phonepeBases(env).status(merchantOrderId), {
      headers: { "Authorization": `O-Bearer ${token}` },
    });
    const order = await sResp.json().catch(() => ({}));
    const state = String(order?.state ?? "").toUpperCase();
    const meta = order?.metaInfo ?? payload?.metaInfo ?? {};
    const appId = meta.udf1, userId = meta.udf2, planId = meta.udf3;

    if (state !== "COMPLETED") return reply(200, { ok: true, state });

    const app = getApp(String(appId || ""));
    const plan = app?.plans?.[String(planId || "")];
    if (!app || !plan || !userId) return reply(200, { ok: true, warning: "unroutable order" });

    // 3) Grant premium on the owning app's backend, signed with that app's shared secret.
    const grantBody = JSON.stringify({ userId, plan: planId, premium_days: plan.premium_days, orderId: merchantOrderId });
    const sig = await hmacHex(process.env[app.secretEnv] || "", grantBody);
    const gResp = await fetch(app.grantUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-hub-signature": sig },
      body: grantBody,
    });
    return reply(200, { ok: true, app: appId, granted: gResp.ok });
  } catch (e) {
    // Ack 200 so PhonePe doesn't retry-storm; the grant is idempotent if PhonePe re-delivers.
    return reply(200, { ok: true, warning: "error logged" });
  }
};
