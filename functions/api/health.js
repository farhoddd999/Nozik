// GET /api/health: quick check that the site is set up. Shows only yes/no,
// never the token itself.
import { json } from "../../lib/http.js";
import { db } from "../../lib/db.js";

export async function onRequestGet({ env }) {
  let database = "not connected (add a D1 binding named DB)";
  try {
    const d = await db(env);
    if (d) {
      const { n } = await d.prepare("SELECT COUNT(*) AS n FROM tanqid").first();
      database = `ok (${n} Tanqid posts)`;
    }
  } catch (err) {
    database = "error: " + String(err?.message || err).slice(0, 200);
  }
  return json({
    site: "ok",
    database,
    telegram_token: env.TELEGRAM_BOT_TOKEN ? "set" : "missing (add secret TELEGRAM_BOT_TOKEN)",
    time: new Date().toISOString(),
  });
}
