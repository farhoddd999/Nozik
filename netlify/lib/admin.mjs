// The owner's private key (Netlify environment variable TANQID_ADMIN_KEY, 12+ characters).
// Opening the site once as /?admin=<key> saves it in that browser.
import { createHash, timingSafeEqual } from "node:crypto";

const hash = (text) => createHash("sha256").update(String(text)).digest("hex");

export function isAdmin(key) {
  const admin = process.env.TANQID_ADMIN_KEY || "";
  if (admin.length < 12 || !key) return false;
  return timingSafeEqual(Buffer.from(hash(key)), Buffer.from(hash(admin)));
}
