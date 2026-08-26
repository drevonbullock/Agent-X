#!/bin/zsh
# Waits for the Anthropic API to be funded, then builds the library week ONCE
# and removes its own launchd job (the self-cleaning one-shot pattern; a
# leftover one-shot re-firing on reboot is how 2026-08-23 happened).
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd "/Users/drevonbullock/C.C. Agent X/Agent X"
cleanup() { launchctl remove com.dre.wicklibwait 2>/dev/null }
trap cleanup EXIT
NODE="$(command -v node)"

for i in {1..288}; do   # up to 24h, every 5 min
  if "$NODE" --input-type=module -e "
import 'dotenv/config'; import Anthropic from '@anthropic-ai/sdk';
const a = new Anthropic();
await a.messages.create({ model:'claude-haiku-4-5-20251001', max_tokens:5, messages:[{role:'user',content:'ok'}] });
process.exit(0);" 2>/dev/null; then
    echo "[libwait] API funded — building the library week"
    exec "$NODE" scripts/wick-week-from-library.js --posts 14
  fi
  sleep 300
done
echo "[libwait] gave up after 24h"
