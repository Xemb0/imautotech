// Shared core for the imautotech.in PAYMENT HUB — one PhonePe gateway for every Autotech app.
//
// PhonePe credentials live ONLY here (Netlify env vars). Apps call pay-create with an HMAC signature
// (their shared secret) and expose a grant endpoint the hub calls — also signed — on a verified
// payment. There is no order database: the webhook re-reads each order from PhonePe's Order Status
// API (authoritative state + the metaInfo we stamped at create time) and routes the grant by app tag.
//
// Add an app = one APPS entry + its HUB_SECRET_<APP> Netlify env var + a grant endpoint on its backend.

const { webcrypto } = require("node:crypto");
const subtle = webcrypto.subtle;

// ── App registry ────────────────────────────────────────────────────────────────────────────────
const APPS = {
  playparty: {
    secretEnv: "HUB_SECRET_PLAYPARTY",
    grantUrl: "https://xjkdesdrdsudtkvnfkdq.supabase.co/functions/v1/hub-grant-premium",
    returnUrl: "https://imautotech.in/playparty/return",
    plans: {
      weekly: { amount_paise: 4500, premium_days: 7 },
      monthly: { amount_paise: 17900, premium_days: 30 },
      yearly: { amount_paise: 179900, premium_days: 365 },
    },
  },
};

const getApp = (id) => APPS[id] || null;

// ── Signing (HMAC-SHA256 hex over the raw request body) ──────────────────────────────────────────
async function hmacHex(secret, raw) {
  const key = await subtle.importKey(
    "raw", new TextEncoder().encode(secret || ""),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(input) {
  const d = await subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

// ── PhonePe (Standard Checkout v2) ───────────────────────────────────────────────────────────────
function phonepeBases(env) {
  // Production is the default; ONLY an explicit "UAT" selects the sandbox. (Branching on "UAT" rather
  // than the prod token keeps the HUB_PHONEPE_ENV value out of the bundle so secrets-scanning passes.)
  return String(env).toUpperCase() === "UAT"
    ? {
        oauth: "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token",
        pay: "https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay",
        status: (id) => `https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/order/${id}/status`,
      }
    : {
        oauth: "https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
        pay: "https://api.phonepe.com/apis/pg/checkout/v2/pay",
        status: (id) => `https://api.phonepe.com/apis/pg/checkout/v2/order/${id}/status`,
      };
}

async function phonepeToken() {
  const env = process.env.HUB_PHONEPE_ENV || "";
  const resp = await fetch(phonepeBases(env).oauth, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.HUB_PHONEPE_CLIENT_ID || "",
      client_version: process.env.HUB_PHONEPE_CLIENT_VERSION || "1",
      client_secret: process.env.HUB_PHONEPE_CLIENT_SECRET || "",
      grant_type: "client_credentials",
    }),
  });
  const j = await resp.json().catch(() => ({}));
  return j?.access_token || null;
}

const JSON_H = { "Content-Type": "application/json" };
const reply = (status, obj) => ({ statusCode: status, headers: JSON_H, body: JSON.stringify(obj) });

module.exports = { APPS, getApp, hmacHex, sha256Hex, timingSafeEqual, phonepeBases, phonepeToken, reply };
