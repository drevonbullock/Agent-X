#!/bin/zsh
# Waits for Dre's re-login, then starts the week fill. Polling `account status`
# here is safe ONLY because nothing else touches the CLI while this waits, and
# the poll stops the moment the batch starts (one CLI user at a time, always).
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd "/Users/drevonbullock/C.C. Agent X/Agent X"
for i in {1..360}; do
  if ./node_modules/.bin/higgsfield account status 2>/dev/null | grep -qi credits; then
    echo "[wait] login restored — pushing credential to Supabase, then building"
    node modules/higgsfield-auth.js --push 2>&1 | tail -1
    exec ./scripts/run-fill-week.sh 14 7
  fi
  sleep 120
done
echo "[wait] gave up after 12h"
