#!/bin/zsh
# Higgsfield token keepalive — MUST run on the Mac.
# The scheduler's 2am/8pm keepalive cron runs on Railway, where the CLI cannot
# execute, so it can never actually refresh anything. The Mac is the only host
# with a working CLI, and before this LaunchAgent existed NOTHING on the Mac
# refreshed the token between batch runs. A ~24h token with no scheduled refresh
# on its only capable host is the exact mechanism of the 08-14 week-long outage.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd "/Users/drevonbullock/C.C. Agent X/Agent X"
exec "/opt/homebrew/bin/node" modules/higgsfield-auth.js --keepalive
