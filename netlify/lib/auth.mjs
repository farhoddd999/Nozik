// Shared with netlify/edge-functions/lock.js: the cookie a browser gets after
// entering the right code. Must compute the same value as the edge function.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE = "nz_auth";
export const pin = () => process.env.SITE_PIN || "5255";

export function token() {
  const secret = process.env.AUTH_SECRET || `nozik-uchun:${pin()}`;
  return createHmac("sha256", secret).update("unlocked-v1").digest("hex");
}

const h = (s) => createHash("sha256").update(String(s)).digest();
export const sameText = (a, b) => timingSafeEqual(h(a), h(b));

export function cookie(req, name) {
  for (const part of (req.headers.get("cookie") || "").split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i) === name) return part.slice(i + 1);
  }
  return null;
}

export const unlocked = (req) => {
  const c = cookie(req, COOKIE);
  return !!c && sameText(c, token());
};
