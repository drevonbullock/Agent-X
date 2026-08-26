#!/bin/zsh
# Waits for Dre's re-login, then runs the week fill ONCE, then REMOVES its own
# launchd job. The self-removal is the fix for 2026-08-23: two leftover
# run-once agents both refired on a reboot and ran two fills concurrently,
# racing the shared CLI credential until Clerk revoked the session. A one-shot
# job that outlives its shot is a landmine; this one cleans up after itself on
# every exit path. The fill also holds its own single-instance lock, so even a
# stacked launch cannot double-run it.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd "/Users/drevonbullock/C.C. Agent X/Agent X"
cleanup() { launchctl remove com.dre.wickrun 2>/dev/null }
trap cleanup EXIT

for i in {1..360}; do
  if ./node_modules/.bin/higgsfield account status 2>/dev/null | grep -qi credits; then
    echo "[wait] login restored — pushing credential to Supabase, then building"
    node modules/higgsfield-auth.js --push 2>&1 | tail -1
    ./scripts/run-fill-week.sh 14 7
    exit 0
  fi
  sleep 120
done
echo "[wait] gave up after 12h"
node --input-type=module -e "
import { alertWick } from './modules/wick-telegram.js';
await alertWick('🔴 Waited 12h and the Higgsfield login never came back. Run on your Mac:\n  higgsfield auth login'); process.exit(0);" 2>/dev/null || true
