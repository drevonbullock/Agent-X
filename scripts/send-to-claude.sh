#!/usr/bin/env bash
# send-to-claude — hand any file or folder on your Mac to Claude's cloud session.
#
#   sendclaude <file-or-folder> [more ...]
#
# Tip: type `sendclaude ` then DRAG the file from Finder into Terminal — it types
# the exact path for you (spaces and all). Then press Enter.
#
# What it does:
#   1. copies everything into ~/Agent-X/inbox/<timestamp>/
#   2. videos are shrunk to 720p H.264 (GitHub rejects files over 100 MB)
#   3. commits and pushes to the branch Claude is working on
# Then tell Claude "sent" (or "check inbox") and it opens whatever you sent.
set -euo pipefail

REPO="${AGENT_X_DIR:-$HOME/Agent-X}"
[ -d "$REPO/.git" ] || { echo "No repo at $REPO (set AGENT_X_DIR)"; exit 1; }
[ $# -gt 0 ] || { echo "usage: sendclaude <file-or-folder> [more ...]"; exit 1; }
FFMPEG="$(command -v ffmpeg || echo /opt/homebrew/bin/ffmpeg)"
DEST="$REPO/inbox/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEST"

send_file() { # $1 = source file, $2 = destination dir
  local src="$1" out="$2" name ext
  name="$(basename "$src")"; ext="$(echo "${name##*.}" | tr '[:upper:]' '[:lower:]')"
  mkdir -p "$out"
  case "$ext" in
    mp4|mov|m4v|webm|mkv|avi)
      [ -x "$FFMPEG" ] || { echo "ffmpeg missing: brew install ffmpeg"; exit 1; }
      echo "shrinking video: $name"
      "$FFMPEG" -loglevel error -y -i "$src" -vf "scale=-2:'min(720,ih)'" -c:v libx264 -crf 26 -preset veryfast -an "$out/${name%.*}.mp4" ;;
    *) cp "$src" "$out/" ;;
  esac
}

for src in "$@"; do
  if [ -d "$src" ]; then
    base="$(basename "$src")"
    while IFS= read -r -d '' f; do
      rel="${f#"$src"/}"; send_file "$f" "$DEST/$base/$(dirname "$rel")"
    done < <(find "$src" -type f ! -name ".DS_Store" -print0)
  elif [ -f "$src" ]; then
    send_file "$src" "$DEST"
  else
    echo "not found: $src"; exit 1
  fi
done

big="$(find "$DEST" -type f -size +95M)"
if [ -n "$big" ]; then echo "Still too big for GitHub (over 95 MB):"; echo "$big"; exit 1; fi

cd "$REPO"
git pull -q --rebase || true
git add inbox
git commit -qm "inbox: $(basename "$1")"
git push -q
echo "Sent to Claude -> ${DEST#"$REPO"/}"
echo "Now tell Claude: sent"
