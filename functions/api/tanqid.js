// GET/POST /api/tanqid: shared posts on the "Tanqid" page, visible to everyone.
// Each visitor's browser keeps a random owner token; only its SHA-256 hash is
// stored, and only the author of a post can edit or delete it.
import { json, clean, readJson } from "../../lib/http.js";
import { db } from "../../lib/db.js";
import { notify } from "../../lib/telegram.js";

const MAX_TEXT = 1000;
const MAX_NAME = 40;
const MAX_ITEMS = 500;

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function list(d, token) {
  const h = token && token.length >= 16 ? await sha256(token) : null;
  const { results } = await d.prepare("SELECT id, side, text, by_name, ts, owner, edited FROM tanqid ORDER BY ts, id").all();
  return results.map((r) => ({
    id: r.id,
    side: r.side,
    text: r.text,
    by: r.by_name,
    ts: r.ts,
    ...(r.edited ? { edited: r.edited } : {}),
    mine: h !== null && r.owner === h,
  }));
}

export async function onRequestGet({ request, env }) {
  const d = await db(env);
  if (!d) return json({ error: "no_db" }, 503);
  return json({ items: await list(d, clean(request.headers.get("x-owner"), 100)) });
}

export async function onRequestPost({ request, env, waitUntil }) {
  const d = await db(env);
  if (!d) return json({ error: "no_db" }, 503);
  const body = await readJson(request);
  if (!body) return json({ error: "bad_request" }, 400);
  const token = clean(body.owner, 100);
  if (token.length < 16) return json({ error: "missing_owner" }, 400);
  const owner = await sha256(token);

  if (body.action === "add") {
    const side = body.side === "me" || body.side === "her" ? body.side : null;
    const text = clean(body.text, MAX_TEXT);
    if (!side || !text) return json({ error: "invalid" }, 400);
    const { n } = await d.prepare("SELECT COUNT(*) AS n FROM tanqid").first();
    if (n >= MAX_ITEMS) return json({ error: "full" }, 429);
    const by = clean(body.by, MAX_NAME) || "Mehmon";
    await d
      .prepare("INSERT INTO tanqid (id, side, text, by_name, ts, owner) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), side, text, by, Date.now(), owner)
      .run();
    waitUntil(notify(env, `📝 Tanqid sahifasida yangi yozuv\n${by} · ${side === "me" ? "Farkhod haqida" : "Nozik haqida"}\n\n${text}`));
  } else if (body.action === "edit" || body.action === "delete") {
    const id = clean(body.id, 80);
    const row = id ? await d.prepare("SELECT owner FROM tanqid WHERE id = ?").bind(id).first() : null;
    if (!row) return json({ error: "not_found" }, 404);
    if (row.owner !== owner) return json({ error: "forbidden" }, 403);
    if (body.action === "delete") {
      await d.prepare("DELETE FROM tanqid WHERE id = ?").bind(id).run();
    } else {
      const text = clean(body.text, MAX_TEXT);
      if (!text) return json({ error: "invalid" }, 400);
      await d.prepare("UPDATE tanqid SET text = ?, edited = ? WHERE id = ?").bind(text, Date.now(), id).run();
    }
  } else {
    return json({ error: "unknown_action" }, 400);
  }

  return json({ items: await list(d, token) });
}
