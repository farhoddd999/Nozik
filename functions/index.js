// GET /: serve the page with the site's own address filled into the
// link-preview tags (og:image must be a full URL). Works on the pages.dev
// address and on any custom domain added later. If anything goes wrong here,
// the page is served unchanged so the home page can never break.
import { NOINDEX } from "../lib/http.js";

export async function onRequestGet(context) {
  const res = await context.next();
  if (res.status !== 200 || !(res.headers.get("content-type") || "").includes("text/html")) return res;
  try {
    const origin = new URL(context.request.url).origin;
    const html = (await res.clone().text()).replaceAll("__SITE_URL__", origin);
    const headers = new Headers(res.headers);
    for (const h of ["content-length", "content-encoding", "etag"]) headers.delete(h);
    headers.set("x-robots-tag", NOINDEX);
    headers.set("cache-control", "public, max-age=0, must-revalidate");
    return new Response(html, { status: 200, headers });
  } catch {
    return res;
  }
}
