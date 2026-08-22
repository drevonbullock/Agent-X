#!/bin/zsh
# Durable runner for the week-fill batch.
# Lives in the REPO, not the scratchpad: the scratchpad is wiped between
# sessions, which killed three separate batch runs on 2026-08-21/22 and once
# took the run's whole log with it. Logs go to logs/ for the same reason.
cd "/Users/drevonbullock/C.C. Agent X/Agent X"
export WICK_IMAGE_MODEL=${WICK_IMAGE_MODEL:-nano_banana_pro}
export WICK_CREDIT_FLOOR=${WICK_CREDIT_FLOOR:-200}
export WICK_GEN_GAP_MS=${WICK_GEN_GAP_MS:-6000}
# launchd does not inherit the login shell PATH, so `node` is not resolvable
# there and the job died with 127 three times before this was pinned.
NODE="${NODE_BIN:-/opt/homebrew/bin/node}"
exec "$NODE" scripts/wick-fill-week.js --posts "${1:-14}" --reels "${2:-7}"
