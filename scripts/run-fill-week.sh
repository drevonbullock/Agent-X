#!/bin/zsh
# Durable runner for the week-fill batch.
# Lives in the REPO, not the scratchpad: the scratchpad is wiped between
# sessions, which killed three separate batch runs on 2026-08-21/22 and once
# took the run's whole log with it. Logs go to logs/ for the same reason.
cd "/Users/drevonbullock/C.C. Agent X/Agent X"
# DISARM THE LAUNCHER FIRST. RunAtLoad plists fire on every login, so a
# leftover one-shot agent is a landmine: a reboot on 2026-08-23 fired two of
# them and ran two fills concurrently. Deleting the plist file (not the loaded
# job -- removing the label would kill this very process) means a reboot finds
# nothing to fire.
rm -f ~/Library/LaunchAgents/com.dre.wickfill.plist ~/Library/LaunchAgents/com.dre.wickwait.plist
# launchd's PATH is /usr/bin:/bin -- no homebrew. The Higgsfield CLI launcher is
# "#!/usr/bin/env node", so without this line the CLI cannot START under
# launchd: readBalance returns null, hfAvailable returns false, and the batch
# aborts before spending anything. That is the whole story of the 10 aborted
# runs on 2026-08-22. Pinning node for our own script was not enough; every
# child process needs the PATH too.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
export WICK_IMAGE_MODEL=${WICK_IMAGE_MODEL:-nano_banana_pro}
export WICK_CREDIT_FLOOR=${WICK_CREDIT_FLOOR:-200}
export WICK_GEN_GAP_MS=${WICK_GEN_GAP_MS:-6000}
# launchd does not inherit the login shell PATH, so `node` is not resolvable
# there and the job died with 127 three times before this was pinned.
NODE="${NODE_BIN:-/opt/homebrew/bin/node}"
exec "$NODE" scripts/wick-fill-week.js --posts "${1:-14}" --reels "${2:-7}"
