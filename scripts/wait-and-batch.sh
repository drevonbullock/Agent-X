#!/bin/zsh
# ─── WAIT FOR HIGGSFIELD AUTH, THEN BUILD THE WEEK ──────────────────────────
# 2026-08-21. What actually happened, because the first version of this file was
# built on a wrong diagnosis and cost a week of content:
#
# I probed https://api.higgsfield.ai/, saw 521, and called it an outage. The CLI
# NEVER CONTACTS THAT HOST. Its real gateway is fnf-api-gw.higgsfield.ai (404 on
# /, because / is not a route) and its auth is clerk.higgsfield.ai (200). Both
# were up the whole time. api.higgsfield.ai is an unrelated hostname that happens
# to sit behind a dead origin, so probing it reports an outage that is not real.
#
# The true cause: the stored credential expired 2026-08-14T21:19Z and the
# refresh_token expired with it, so `auth token` returned "Session expired".
# ~/.config/higgsfield/credentials.json was gone, leaving only a stale .lock.
#
# So the trigger here is AUTH, not reachability. `account status` succeeding is
# the only signal that means work can actually be done.
#
#   nohup ./scripts/wait-and-batch.sh > /tmp/wick-watch.log 2>&1 &
cd "/Users/drevonbullock/C.C. Agent X/Agent X"

MAX_WAIT_MIN=${MAX_WAIT_MIN:-1440}   # 24h
INTERVAL=${INTERVAL:-180}
waited=0

# nano_banana_pro is 2 credits an image against gpt_image_2's 7. A full 14 post
# week costs ~156 credits instead of ~800, which is the only way "keep 1000
# credits" and "a week of posts" are both true on a 1197 balance. Every Wick
# frame is a pure scene (all text is composited by us), and the model's habit of
# inventing UI text is countered by NO_TEXT_HARD in wick-render.js. The image QA
# still grades every slide before any of it can publish.
export WICK_IMAGE_MODEL=${WICK_IMAGE_MODEL:-nano_banana_pro}

say() {
  node --input-type=module -e "
import { alertWick } from './modules/wick-telegram.js';
await alertWick(process.argv[1]); process.exit(0);" "$1" 2>/dev/null || true
}

echo "[Wait] waiting for Higgsfield AUTH (every ${INTERVAL}s, up to ${MAX_WAIT_MIN}m) model=$WICK_IMAGE_MODEL"

while [ $waited -lt $((MAX_WAIT_MIN * 60)) ]; do
  # 'account status' is READ ONLY and needs a live session, so it tests exactly
  # the thing that matters. Never probe with 'auth token': that ROTATES the
  # token and would kill the batch this script is about to start.
  if ./node_modules/.bin/higgsfield account status 2>&1 | grep -qi credits; then
    echo "[Wait] auth is live. Building."
    say "🟢 Higgsfield login restored. Building the week now on ${WICK_IMAGE_MODEL} (2 credits/image, ~156 for 14 posts). Your 1000 credit floor stays intact."

    # Push the freshly refreshed credential to Supabase so Railway gets it too.
    node modules/higgsfield-auth.js --push 2>&1 | tail -2 || true

    node --input-type=module -e "
import { runWeeklyBatch } from './modules/wicks-wisdom.js';
import { runWeeklyReels } from './modules/wick-reel-batch.js';
import { readBalance, creditsPerImage } from './modules/credit-guard.js';
import { alertWick } from './modules/wick-telegram.js';

const before = readBalance();
console.log('[Wait] balance before:', before, '@', creditsPerImage(), 'credits/image');

// 14 posts = 2/day for the week. The credit guard re-checks the live balance
// before EVERY post and stops on the floor rather than breaking it, so this
// asks for the full week and lets the floor decide how much of it lands.
let posts = 0, reels = 0, err = '';
try {
  const r = await runWeeklyBatch();            // runs its own image QA gate
  posts = r?.created?.length ?? 0;
} catch (e) { err += 'posts: ' + e.message + '\n'; }

try {
  const r = await runWeeklyReels({ count: 7 });  // 1 reel image per day
  reels = Array.isArray(r) ? r.length : (r?.created?.length ?? 0);
} catch (e) { err += 'reels: ' + e.message + '\n'; }

const after = readBalance();
const spent = (before != null && after != null) ? before - after : null;
const msg = [
  posts || reels ? '✅ Batch done' : '⚠️ Batch produced nothing',
  '',
  posts + ' posts, ' + reels + ' reel images',
  spent != null ? 'spent ~' + spent + ' credits, ' + after + ' left' : 'balance unreadable',
  err ? '\nerrors:\n' + err : '',
].join('\n');
console.log(msg);
try { await alertWick(msg); } catch {}
process.exit(0);"

    echo "[Wait] finished"
    exit 0
  fi

  echo "[Wait] still not authenticated, ${waited}s elapsed"
  sleep $INTERVAL
  waited=$((waited + INTERVAL))
done

echo "[Wait] gave up after ${MAX_WAIT_MIN} minutes."
# Say so. A watcher that dies quietly is why nobody noticed for a week.
say "🔴 Higgsfield is still logged out after ${MAX_WAIT_MIN} minutes. No Wick art can be built and the queue is empty.

Fix on your Mac:
  higgsfield auth login
  node modules/higgsfield-auth.js --push"
