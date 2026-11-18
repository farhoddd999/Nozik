// Sends a message to the site owner's Telegram through a bot.
//
// Setup (once): create a bot with @BotFather, put its token in the Netlify
// environment variable TELEGRAM_BOT_TOKEN, then send /start to the bot from
// the owner's account. The owner's chat id is found automatically from that
// /start message (matched by username) and remembered in Netlify Blobs.
// TELEGRAM_CHAT_ID can be set instead to skip the lookup.
import { getStore } from "@netlify/blobs";

const OWNER = (process.env.TELEGRAM_USERNAME || "ffarxod").replace(/^@/, "").toLowerCase();
const api = (method) => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`;

async function findChatId(store) {
  if (process.env.TELEGRAM_CHAT_ID) return process.env.TELEGRAM_CHAT_ID;
  const saved = await store.get("chat_id");
  if (saved) return saved;
  const res = await fetch(api("getUpdates"));
  const data = await res.json().catch(() => ({}));
  for (const update of [...(data.result || [])].reverse()) {
    const msg = update.message || update.edited_message || update.my_chat_member;
    if (msg?.from?.username?.toLowerCase() === OWNER && msg?.chat?.id) {
      const id = String(msg.chat.id);
      await store.set("chat_id", id);
      return id;
    }
  }
  return null;
}

export async function notify(text) {
  if (!process.env.TELEGRAM_BOT_TOKEN) return { ok: false, reason: "no_token" };
  try {
    const store = getStore({ name: "telegram", consistency: "strong" });
    const chatId = await findChatId(store);
    if (!chatId) return { ok: false, reason: "no_chat" };
    const res = await fetch(api("sendMessage"), {
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
