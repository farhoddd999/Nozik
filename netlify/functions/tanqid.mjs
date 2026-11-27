// Shared posts for the "Tanqid" page, visible to everyone who opens the site.
// Each visitor's browser keeps a random owner token; only the token's hash is
// stored, and only the author of a post can edit or delete it.
//
// Optional moderation: set the Netlify environment variable TANQID_ADMIN_KEY
// (12+ characters). Opening the site once as /?admin=<key> lets that browser
// delete any post (never edit). Without the variable, moderation is off.
import { getStore } from "@netlify/blobs";
import { createHash, randomUUID } from "node:crypto";
import { json, clean, readJson } from "../lib/http.mjs";
import { unlocked } from "../lib/auth.mjs";
import { notify } from "../lib/telegram.mjs";
import { isAdmin } from "../lib/admin.mjs";

const MAX_TEXT = 1000;
const MAX_NAME = 40;
const MAX_ITEMS = 500;
const hash = (token) => createHash("sha256").update(token).digest("hex");

async function keys(store) {
  const { blobs } = await store.list({ prefix: "i/" });
  return blobs.map((b) => b.key);
}

async function load(store) {
  const items = await Promise.all((await keys(store)).map((k) => store.get(k, { type: "json" })));
  return items.filter(Boolean).sort((a, b) => a.ts - b.ts);
}

const publicView = (items, token) => {
  const h = token && token.length >= 16 ? hash(token) : null;
  return items.map(({ owner, ...item }) => ({ ...item, mine: h !== null && owner === h }));
};

export default async (req) => {
  if (!unlocked(req)) return json({ error: "locked" }, 401);
  const store = getStore({ name: "tanqid", consistency: "strong" });

  if (req.method === "GET") {
    const admin = isAdmin(req.headers.get("x-admin"));
    return json({ items: publicView(await load(store), clean(req.headers.get("x-owner"), 100)), ...(admin ? { admin } : {}) });
  }
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const body = await readJson(req);
  if (!body) return json({ error: "bad_request" }, 400);
  const token = clean(body.owner, 100);
  if (token.length < 16) return json({ error: "missing_owner" }, 400);
  const owner = hash(token);
  const admin = isAdmin(body.admin);

  if (body.action === "add") {
    const side = body.side === "me" || body.side === "her" ? body.side : null;
    const text = clean(body.text, MAX_TEXT);
    if (!side || !text) return json({ error: "invalid" }, 400);
    if ((await keys(store)).length >= MAX_ITEMS) return json({ error: "full" }, 429);
    const item = { id: randomUUID(), side, text, by: clean(body.by, MAX_NAME) || "Mehmon", ts: Date.now(), owner };
    await store.setJSON(`i/${item.ts}-${item.id}`, item);
    await notify(
      `📝 Tanqid sahifasida yangi yozuv\n${item.by} · ${side === "me" ? "Farkhod haqida" : "Nozik haqida"}\n\n${text}`,
    );
  } else if (body.action === "edit" || body.action === "delete") {
    const id = clean(body.id, 80);
    const key = id && (await keys(store)).find((k) => k.endsWith(`-${id}`));
    const item = key && (await store.get(key, { type: "json" }));
    if (!item) return json({ error: "not_found" }, 404);
    const own = item.owner === owner;
    if (!own && !(admin && body.action === "delete")) return json({ error: "forbidden" }, 403);
    if (body.action === "delete") {
      await store.delete(key);
    } else {
      const text = clean(body.text, MAX_TEXT);
      if (!text) return json({ error: "invalid" }, 400);
      await store.setJSON(key, { ...item, text, edited: Date.now() });
    }
  } else {
    return json({ error: "unknown_action" }, 400);
  }

  return json({ items: publicView(await load(store), token), ...(admin ? { admin } : {}) });
};

export const config = { path: "/api/tanqid" };
