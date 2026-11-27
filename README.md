# Nozik uchun

A small, private website made by Farkhod for Nozik. It is hidden from search
engines, and the whole site is locked behind a 4-digit code (see **The lock** below).

## How it is built

| Path | What it is |
|---|---|
| `site/` | Everything visitors get. This folder is what Netlify publishes. |
| `site/index.html` | The whole site in one file: pages, styles and scripts. |
| `site/song.m4a` | Background song (Ravyn Lenae — Love Me Not), loaded only when music starts. |
| `site/og.jpg`, icons, `manifest.webmanifest` | Link preview picture, browser/home-screen icons. |
| `site/lock.html` | The lock screen with the number keypad, shown until the right code is entered. |
| `site/404.html` | "Page not found" page. |
| `netlify/edge-functions/lock.js` | Runs before every request and keeps the site locked until the code is entered. |
| `netlify/functions/` | Small backend: unlocking (`unlock.mjs`), shared Tanqid posts (`tanqid.mjs`), feedback to Telegram (`feedback.mjs`) and the visit counter (`visit.mjs`). Data is stored in Netlify Blobs. |
| `netlify/lib/` | Shared code for the backend (lock cookie, Telegram, request helpers). |
| `netlify.toml` | Netlify settings: publish `site/`, fill the site address into the link preview, headers, functions. |
| `site/photos/` | Photos on the memories timeline (metadata removed, two sizes each). |

The 3D flower uses three.js, loaded in the background from cdnjs, so the page works
even before (or without) it. Photos of the favourites come from Wikimedia Commons.

## Deploying on Netlify

The repository is connected to Netlify. Every push to `main` deploys the site.
Pushes to other branches and pull-request previews are skipped to save credits.

Build settings come from `netlify.toml`; nothing needs to be set by hand except:

| Environment variable | Needed? | What it does |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Yes, for feedback | Token of the Telegram bot made with @BotFather. Send the bot any message once so it can find your chat. |
| `TANQID_ADMIN_KEY` | Optional | Any secret of 12+ characters. Open the site once as `https://<site>/?admin=<key>` and that browser can delete any Tanqid post. |
| `TELEGRAM_CHAT_ID` | Optional | Skips the automatic chat lookup. |
| `TELEGRAM_USERNAME` | Optional | Defaults to `ffarxod`. |
| `SITE_PIN` | Optional | The code for the lock screen. Defaults to `5255`. Changing it locks every phone out again until the new code is entered. |
| `AUTH_SECRET` | Optional | Any long random text. Makes the unlock cookie impossible to work out even for someone who knows the code and this code base. Changing it also locks everyone out again. |

After changing environment variables, run **Deploys → Trigger deploy → Deploy site** once.

## Changing the texts

All texts are in `site/index.html`:

| What | Search for |
|---|---|
| Favourites (names, facts, links, personal notes `p:`) | `const FV=[` |
| Farkhod's lines on the bear's postcards | `const Q=[` (the first line is kept for the end of the letter) |
| Wishes in "Orzu mashinasi" | `const WS=[` |
| Quiz questions | `const Qz=[` |
| Starting Tanqid entries | `const SEED=[` |
| Memories timeline (and its photo) | `id="p-xotira"` |
| The letter | `id="p-kechirim"` |
| Promises and contact | `id="p-vada"`, `id="p-contact"` |
| "Together since" counter (home page) | `class="since"` for the label; the start date is `Date.UTC(2022,8,19)` (months count from 0, Tashkent time) |
| Birthday (24 July) greeting and note | `const BDAY=` and `Yaxshiyamki borsan!` |
| Bear chatbot replies | `function local(s)` |
| Reply to the letter: thank-you texts | `const MSG=` (the answer buttons are in `id="reply"`; the same answers are listed in `CHOICES` in `netlify/functions/feedback.mjs`) |
| Photos for favourites | `const PH=` (Wikimedia Commons file names) |

## The lock

Every page, photo, the song and the backend are locked. Opening any link shows
`site/lock.html` instead: the sentence above the code line is
"Bilaman haliyam kuzatyapsan" and, after the first wrong try,
"Yarashganimizda kodini bila olasan" (both are in `site/lock.html`).

- The code is checked on the server (`netlify/functions/unlock.mjs`), never in the
  page, so it cannot be read from the page source.
- The right code gives that browser a cookie that keeps it unlocked for 6 months.
  The link someone opened (for example `#dunyo/3`) is kept after unlocking.
- Guessing is slowed down: every wrong code waits half a second, the keypad rests
  for 30 seconds after 5 wrong tries, and after 10 wrong codes in 15 minutes the
  server refuses that connection until the 15 minutes are over. For this it keeps
  only a keyed hash of the connection, never the address, and removes it when the
  right code is entered.
- Public on purpose: the link preview picture (`og.jpg`), icons, `manifest.webmanifest`
  and `robots.txt`, so the link still shows its picture in Telegram.
- A 4-digit code is a gentle lock, not a vault: someone patient enough can still
  guess it over days. For a stronger lock, set `SITE_PIN` to a longer number (the
  keypad accepts only 4 digits, so also change `N=4` in `site/lock.html`).

## Visit counter

The site counts visits anonymously (`netlify/functions/visit.mjs`): one count per
browser visit, stored only as a date. No names, IP addresses or device details are
kept, and the footer says so. Your own browser is never counted once you have opened
the admin link. With `TANQID_ADMIN_KEY` set, open `/?admin=<key>#tanqid` to see
today, the last 7 days, the total and a 14-day chart at the top of the Tanqid page.

## Moderating Tanqid

Anyone with the link can write on Tanqid. To remove a post: set `TANQID_ADMIN_KEY`
(see above) and use the delete button that then appears under every post, or delete
it in Netlify under **Blobs → tanqid**.
