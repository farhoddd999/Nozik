// Locks the whole site behind the code (SITE_PIN, default 5255).
// Runs before every request except a short list of public files (the lock
// screen itself, the link-preview image and the icons). Without the unlock
// cookie a page visit gets the lock screen and any other file gets 401.
// The cookie is set by netlify/functions/unlock.mjs and must match the value
// computed in netlify/lib/auth.mjs.
const COOKIE = "nz_auth";

async function expectedToken() {
  const pin = Netlify.env.get("SITE_PIN") || "5255";
  const secret = Netlify.env.get("AUTH_SECRET") || `nozik-uchun:${pin}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("unlocked-v1"));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function cookie(request, name) {
  for (const part of (request.headers.get("cookie") || "").split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i) === name) return part.slice(i + 1);
  }
  return null;
}

export default async (request) => {
  if (cookie(request, COOKIE) === (await expectedToken())) return; // unlocked: serve as usual
  const wantsPage = request.method === "GET" && (request.headers.get("accept") || "").includes("text/html");
  if (wantsPage || new URL(request.url).pathname === "/") return new URL("/lock.html", request.url);
  return new Response("Locked", {
    status: 401,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
};

export const config = {
  path: "/*",
  excludedPath: [
    "/lock.html",
    "/api/*",
    "/og.jpg",
    "/favicon.svg",
    "/favicon-32.png",
    "/apple-touch-icon.png",
    "/icon-192.png",
    "/icon-512.png",
    "/icon-maskable-512.png",
    "/manifest.webmanifest",
    "/robots.txt",
  ],
};
