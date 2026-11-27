// Anonymous visit counter.
// POST: the page reports one visit per browser session. Only "a visit happened
// on this day" is stored: no names, no IP addresses, no device details.
// GET:  the owner (with the admin key) sees today, the last 7 days, the total
// and the last 14 days.
import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";
import { json } from "../lib/http.mjs";
import { unlocked } from "../lib/auth.mjs";
import { isAdmin } from "../lib/admin.mjs";

const day = (ts) => new Date(ts + 5 * 36e5).toISOString().slice(0, 10); // date in Tashkent

export default async (req) => {
  if (!unlocked(req)) return json({ error: "locked" }, 401);
  const store = getStore({ name: "visits", consistency: "strong" });

  if (req.method === "POST") {
    const now = Date.now();
    await store.set(`v/${day(now)}/${now}-${randomUUID().slice(0, 8)}`, "1");
    return json({ ok: true });
  }

  if (req.method === "GET") {
    if (!isAdmin(req.headers.get("x-admin"))) return json({ error: "forbidden" }, 403);
    const { blobs } = await store.list({ prefix: "v/" });
    const perDay = {};
    for (const b of blobs) {
      const d = b.key.slice(2, 12);
      perDay[d] = (perDay[d] || 0) + 1;
    }
    const now = Date.now();
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = day(now - i * 864e5);
      days.push({ d, n: perDay[d] || 0 });
    }
    return json({
      today: perDay[day(now)] || 0,
      last7: days.slice(-7).reduce((sum, x) => sum + x.n, 0),
      total: blobs.length,
      days,
    });
  }

  return json({ error: "method_not_allowed" }, 405);
};

export const config = { path: "/api/visit" };
