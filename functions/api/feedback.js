// POST /api/feedback: forwards feedback from the site to the owner's Telegram.
// Every message is saved first, so nothing is lost if Telegram is not set up
// yet; undelivered messages are retried the next time feedback arrives.
import { json, clean, readJson } from "../../lib/http.js";
import { db } from "../../lib/db.js";
import { notify } from "../../lib/telegram.js";

const format = (f) =>
  `💌 Nozik uchun sayti: yangi fikr\nKimdan: ${f.name || "ismsiz"}\nVaqt: ${new Date(f.ts).toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })}\n\n${f.message}`;

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  const message = clean(body?.message, 2000);
  if (!message) return json({ error: "empty" }, 400);
  const entry = { id: crypto.randomUUID(), name: clean(body.name, 40), message, ts: Date.now() };

  const d = await db(env);
  if (!d) {
    // No database bound: try Telegram directly, and say so if it fails.
    const r = await notify(env, format(entry));
    return json({ ok: r.ok, delivered: r.ok }, r.ok ? 200 : 503);
  }

  await d.prepare("INSERT INTO feedback (id, name, message, ts, sent) VALUES (?, ?, ?, ?, 0)").bind(entry.id, entry.name, entry.message, entry.ts).run();
  let delivered = false;
  const { results } = await d.prepare("SELECT id, name, message, ts FROM feedback WHERE sent = 0 ORDER BY ts, id").all();
  for (const item of results) {
    const r = await notify(env, format(item));
    if (!r.ok) break;
    await d.prepare("UPDATE feedback SET sent = 1 WHERE id = ?").bind(item.id).run();
    if (item.id === entry.id) delivered = true;
  }
  return json({ ok: true, delivered });
}
