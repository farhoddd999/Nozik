// Receives feedback from the site and forwards it to the owner's Telegram.
// Every message is also saved first, so nothing is lost if Telegram is not set
// up yet: undelivered messages are retried the next time feedback arrives.
import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";
import { json, clean, readJson } from "../lib/http.mjs";
import { notify } from "../lib/telegram.mjs";

const format = (f) =>
  `💌 Nozik uchun sayti: yangi fikr\nKimdan: ${f.name || "ismsiz"}\nVaqt: ${new Date(f.ts).toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })}\n\n${f.message}`;

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const body = await readJson(req);
  const message = clean(body?.message, 2000);
  if (!message) return json({ error: "empty" }, 400);

  const store = getStore({ name: "feedback", consistency: "strong" });
  const entry = { name: clean(body.name, 40), message, ts: Date.now(), sent: false };
  const key = `f/${entry.ts}-${randomUUID()}`;
  await store.setJSON(key, entry);

  let delivered = false;
  const { blobs } = await store.list({ prefix: "f/" });
  for (const k of blobs.map((b) => b.key).sort()) {
    const item = await store.get(k, { type: "json" });
    if (!item || item.sent) continue;
    const result = await notify(format(item));
    if (!result.ok) break;
    await store.setJSON(k, { ...item, sent: true });
    if (k === key) delivered = true;
  }
  return json({ ok: true, delivered });
};

export const config = { path: "/api/feedback" };
