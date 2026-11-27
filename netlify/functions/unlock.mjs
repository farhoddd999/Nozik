// POST /api/unlock  {pin}  -> sets the unlock cookie when the code is right.
//
// Guessing is made slow: every wrong code is answered after a short pause, and
// after MAX_WRONG wrong codes in WINDOW the same connection has to wait until
// the window ends. Only a keyed hash of the connection address is kept for
// that (never the address itself), and it is removed once the right code is
// entered.
import { getStore } from "@netlify/blobs";
import { createHmac } from "node:crypto";
import { json, clean, readJson } from "../lib/http.mjs";
import { COOKIE, pin, token, sameText } from "../lib/auth.mjs";

const MAX_AGE = 60 * 60 * 24 * 180; // stay unlocked on this device for 6 months
const MAX_WRONG = 10;
const WINDOW = 15 * 60 * 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default async (req, context) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const store = getStore({ name: "unlock", consistency: "strong" });
  const who = `a/${createHmac("sha256", token()).update(String(context?.ip || "unknown")).digest("hex").slice(0, 32)}`;
  const now = Date.now();
  let tries = await store.get(who, { type: "json" });
  if (tries && now - tries.since > WINDOW) tries = null;
  if (tries && tries.n >= MAX_WRONG) {
    return json({ ok: false, wait: Math.ceil((tries.since + WINDOW - now) / 1000) }, 429);
  }

  const body = await readJson(req);
  const given = clean(body?.pin, 12).replace(/\D/g, "");
  if (!given || !sameText(given, pin())) {
    const n = (tries?.n || 0) + 1;
    const since = tries?.since || now;
    await store.setJSON(who, { n, since });
    await sleep(500);
    return n >= MAX_WRONG ? json({ ok: false, wait: Math.ceil((since + WINDOW - now) / 1000) }, 429) : json({ ok: false }, 401);
  }

  if (tries) await store.delete(who);
  const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "set-cookie": `${COOKIE}=${token()}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; SameSite=Lax${secure}`,
    },
  });
};

export const config = { path: "/api/unlock" };
