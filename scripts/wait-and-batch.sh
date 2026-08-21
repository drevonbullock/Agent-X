#!/bin/zsh
# ─── WAIT FOR HIGGSFIELD, THEN BUILD THE WEEK ───────────────────────────────
# 2026-08-14 → still down 08-21: api.higgsfield.ai returns 521 (Cloudflare
# reached their edge, their origin refused it) on every path, while higgsfield.ai
# itself serves 200. Their API is down. The CLI's "Not authenticated" is a
# symptom of validating a token against a dead endpoint, not a credential fault.
#
# Nothing on our side fixes that, so this waits and then builds unattended. The
# previous version gave up after 3 hours and died silently, which is how a whole
# week passed with an empty queue. This one waits a full day and SAYS so on
# Telegram either way.
#
#   nohup ./scripts/wait-and-batch.sh > /tmp/wick-watch.log 2>&1 &
cd "/Users/drevonbullock/C.C. Agent X/Agent X"

MAX_WAIT_MIN=${MAX_WAIT_MIN:-1440}   # 24h
INTERVAL=${INTERVAL:-180}
waited=0

# nano_banana_pro is 2 credits an image against gpt_image_2's 7. A full 14 post
# week costs ~156 credits instead of ~800, which is the only way "keep 1000
# credits" and "a week of posts" are both true on the current balance. Every Wick
# frame is a pure scene (all text is composited by us), and the model's habit of
# inventing UI text is already countered by NO_TEXT_HARD in wick-render.js.
# The image QA still grades every slide before any of it can publish.
export WICK_IMAGE_MODEL=${WICK_IMAGE_MODEL:-nano_banana_pro}

say() {
  node --input-type=module -e "
import { alertWick } from './modules/wick-telegram.js';
await alertWick(process.argv[1]); process.exit(0);" "$1" 2>/dev/null || true
}

echo "[Wait] watching api.higgsfield.ai (every ${INTERVAL}s, up to ${MAX_WAIT_MIN}m) model=$WICK_IMAGE_MODEL"

while [ $waited -lt $((MAX_WAIT_MIN * 60)) ]; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 https://api.higgsfield.ai/ 2>/dev/null)

  # Cloudflare 52x / 000 all mean the origin is still unreachable.
  case "$code" in
    521|522|523|524|000|"")
      echo "[Wait] still down (HTTP ${code:-timeout}), ${waited}s elapsed"
      ;;
    *)
      echo "[Wait] api.higgsfield.ai -> HTTP $code, probing the CLI"
      # 'account status' is READ ONLY. Never probe with 'auth token' here: that
      # ROTATES the token and would kill the batch this script is about to start.
      if ./node_modules/.bin/higgsfield account status 2>&1 | grep -qi credits; then
        echo "[Wait] CLI is healthy. Building."
        say "🟢 Higgsfield is back. Building the week now on ${WICK_IMAGE_MODEL} (2 credits/image, ~156 for 14 posts). Your 1000 credit floor stays intact."

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
  const r = await runWeeklyBatch();          // runs its own image QA gate
  posts = r?.created?.length ?? 0;
} catch (e) { err += 'posts: ' + e.message + '\n'; }

try {
  const r = await runWeeklyReels({ count: 7 });   // 1 reel image per day
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
      echo "[Wait] edge is up but the CLI still cannot reach it, continuing"
      ;;
  esac

  sleep $INTERVAL
  waited=$((waited + INTERVAL))
done

echo "[Wait] gave up after ${MAX_WAIT_MIN} minutes."
# Say so. A watcher that dies quietly is why nobody noticed the last outage.
say "🔴 Higgsfield has been down for ${MAX_WAIT_MIN} minutes straight (HTTP 521 from their origin, their marketing site is fine). No new Wick art could be built and the queue is still empty. Nothing on our side can fix this."
