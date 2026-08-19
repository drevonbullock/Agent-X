#!/bin/zsh
# ─── WAIT FOR HIGGSFIELD, THEN BUILD ────────────────────────────────────────
# 2026-08-14: api.higgsfield.ai returned HTTP 522 (Cloudflare cannot reach their
# origin) while higgsfield.ai itself served 200. Their API was down, not our
# credentials: the CLI's "Not authenticated" was a symptom of validating a token
# against a dead endpoint.
#
# Nothing on our side can fix that, so this waits for the API to come back and
# then runs the batch unattended. The credit floor still applies: the batch
# checks the live balance before every post and stops rather than break it.
cd "/Users/drevonbullock/C.C. Agent X/Agent X"

MAX_WAIT_MIN=180
INTERVAL=120
waited=0

echo "[Wait] watching api.higgsfield.ai for recovery (checking every ${INTERVAL}s)"

while [ $waited -lt $((MAX_WAIT_MIN * 60)) ]; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 25 https://api.higgsfield.ai/ 2>/dev/null)

  # Cloudflare 5xx means their origin is still unreachable. Anything else means
  # the edge is talking to a live backend again.
  if [ "$code" != "522" ] && [ "$code" != "523" ] && [ "$code" != "521" ] && [ "$code" != "000" ]; then
    echo "[Wait] api.higgsfield.ai -> HTTP $code, probing the CLI"
    if ./node_modules/.bin/higgsfield account status 2>&1 | grep -q credits; then
      echo "[Wait] CLI is healthy. Starting the batch."
      node --input-type=module -e "
import { runWeeklyBatch } from './modules/wicks-wisdom.js';
// Cheapest formats first so the spend above the floor buys the most posts.
// The batch re-checks the live balance before EVERY post and stops on the floor.
const r = await runWeeklyBatch({ formats: ['ORDER','PARABLE','LESSON','ORDER','PARABLE','LESSON','COSTUME'] });
console.log('BATCH RESULT:', JSON.stringify(r)?.slice(0,200));
process.exit(0);"
      exit 0
    fi
    echo "[Wait] edge is up but the CLI still cannot authenticate, continuing to wait"
  else
    echo "[Wait] still down (HTTP ${code:-timeout}), ${waited}s elapsed"
  fi

  sleep $INTERVAL
  waited=$((waited + INTERVAL))
done

echo "[Wait] gave up after ${MAX_WAIT_MIN} minutes. Higgsfield is still down."
