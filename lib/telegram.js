// Sends a message to the site owner's Telegram through a bot.
//
// Setup (once): create a bot with @BotFather, add its token to the Pages
// project as the secret TELEGRAM_BOT_TOKEN, then send /start to the bot from
// the owner's account. The owner's chat id is found from that message
// (matched by username, default "ffarxod") and remembered in the database.
// TELEGRAM_CHAT_ID can be set instead to skip the lookup.
import { db } from "./db.js";

async function findChatId(env, base) {
  if (env.TELEGRAM_CHAT_ID) return String(env.TELEGRAM_CHAT_ID);
  const d = await db(env);
  if (d) {
    const row = await d.prepare("SELECT v FROM settings WHERE k = 'telegram_chat_id'").first();
    if (row?.v) return row.v;
  }
  const owner = String(env.TELEGRAM_USERNAME || "ffarxod").replace(/^@/, "").toLowerCase();
  const res = await fetch(base + "getUpdates");
  const data = await res.json().catch(() => ({}));
  for (const update of [...(data.result || [])].reverse()) {
    const msg = update.message || update.edited_message || update.my_chat_member;
    if (msg?.from?.username?.toLowerCase() === owner && msg?.chat?.id) {
      const id = String(msg.chat.id);
      if (d) await d.prepare("INSERT OR REPLACE INTO settings (k, v) VALUES ('telegram_chat_id', ?)").bind(id).run();
      return id;
    }
  }
  return null;
}

export async function notify(env, text) {
  if (!env.TELEGRAM_BOT_TOKEN) return { ok: false, reason: "no_token" };
  const base = `${env.TELEGRAM_API || "https://api.telegram.org"}/bot${env.TELEGRAM_BOT_TOKEN}/`;
  try {
    const chatId = await findChatId(env, base);
    if (!chatId) return { ok: false, reason: "no_chat" };
    const res = await fetch(base + "sendMessage", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: String(text).slice(0, 4000), disable_web_page_preview: true }),
    });
    const data = await res.json().catch(() => ({}));
    return data.ok ? { ok: true } : { ok: false, reason: data.description || "send_failed" };
  } catch (err) {
    return { ok: false, reason: String(err?.message || err) };
  }
}
