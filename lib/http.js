export const NOINDEX = "noindex, nofollow, noarchive, nosnippet, noimageindex";

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-robots-tag": NOINDEX },
  });

export const clean = (value, max) =>
  String(value ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
