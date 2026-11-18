// Cloudflare D1 database, bound to the Pages project under the name "DB".
// Tables are created automatically on first use, so no manual SQL is needed.
let ready = null;

export function db(env) {
  if (!env.DB) return null;
  if (!ready) {
    ready = env.DB.batch([
      env.DB.prepare(
        "CREATE TABLE IF NOT EXISTS tanqid (id TEXT PRIMARY KEY, side TEXT NOT NULL, text TEXT NOT NULL, by_name TEXT NOT NULL, ts INTEGER NOT NULL, owner TEXT NOT NULL, edited INTEGER)",
      ),
      env.DB.prepare(
        "CREATE TABLE IF NOT EXISTS feedback (id TEXT PRIMARY KEY, name TEXT, message TEXT NOT NULL, ts INTEGER NOT NULL, sent INTEGER NOT NULL DEFAULT 0)",
      ),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT)"),
    ]).catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready.then(() => env.DB);
}
