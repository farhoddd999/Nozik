# Nozik uchun

A small, private website made by Farkhod for Nozik. It is hidden from search
engines; only people with the link can find it.

## How it is built

| Path | What it is |
|---|---|
| `site/` | Everything visitors get. This folder is what Netlify publishes. |
| `site/index.html` | The whole site in one file: pages, styles and scripts. |
| `site/song.m4a` | Background song (Ravyn Lenae — Love Me Not), loaded only when music starts. |
| `site/og.jpg`, icons, `manifest.webmanifest` | Link preview picture, browser/home-screen icons. |
| `site/404.html` | "Page not found" page. |
| `netlify/functions/` | Small backend: shared Tanqid posts (`tanqid.mjs`) and feedback to Telegram (`feedback.mjs`). Data is stored in Netlify Blobs. |
| `netlify/lib/` | Shared code for the backend (Telegram, request helpers). |
| `netlify.toml` | Netlify settings: publish `site/`, fill the site address into the link preview, headers, functions. |
| `functions/`, `lib/` | An older copy of the backend for Cloudflare Pages. Not used on Netlify. |

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
| Memories timeline | `id="p-xotira"` |
| The letter | `id="p-kechirim"` |
| Promises and contact | `id="p-vada"`, `id="p-contact"` |
| Photos for favourites | `const PH=` (Wikimedia Commons file names) |

## Moderating Tanqid

Anyone with the link can write on Tanqid. To remove a post: set `TANQID_ADMIN_KEY`
(see above) and use the delete button that then appears under every post, or delete
it in Netlify under **Blobs → tanqid**.
