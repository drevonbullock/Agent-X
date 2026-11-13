#!/usr/bin/env bash
# send-to-claude — hand any file or folder on your Mac to Claude's cloud session.
#
#   sendclaude <file-or-folder> [more ...]
#
# Tip: type `sendclaude ` then DRAG the file from Finder into Terminal — it types
# the exact path for you (spaces and all). Then press Enter.
#
# What it does:
#   1. switches ~/Agent-X to the branch Claude is working on (works from any clone)
#   2. copies everything into inbox/<timestamp>/
#   3. videos are shrunk to 720p (ffmpeg if installed, else macOS's built-in avconvert)
#   4. commits and pushes straight to Claude's branch
# Then tell Claude "sent" (or "check inbox") and it opens whatever you sent.
set -euo pipefail

REPO="${AGENT_X_DIR:-$HOME/Agent-X}"
BRANCH="${CLAUDE_BRANCH:-claude/wicks-wisdom-video-plan-1uu7th}"
[ -d "$REPO/.git" ] || { echo "No repo at $REPO (set AGENT_X_DIR)"; exit 1; }
[ $# -gt 0 ] || { echo "usage: sendclaude <file-or-folder> [more ...]"; exit 1; }
for src in "$@"; do [ -e "$src" ] || { echo "not found: $src"; exit 1; }; done

echo "switching $REPO to $BRANCH ..."
cd "$REPO"
git fetch -q origin "$BRANCH"
git checkout -q -B "$BRANCH" FETCH_HEAD
cd - >/dev/null

FFMPEG="$(command -v ffmpeg || true)"; [ -n "$FFMPEG" ] || { [ -x /opt/homebrew/bin/ffmpeg ] && FFMPEG=/opt/homebrew/bin/ffmpeg; } || true
DEST="$REPO/inbox/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEST"

send_file() { # $1 = source file, $2 = destination dir
  local src="$1" out="$2" name ext
  name="$(basename "$src")"; ext="$(echo "${name##*.}" | tr '[:upper:]' '[:lower:]')"
  mkdir -p "$out"
  case "$ext" in
    mp4|mov|m4v|webm|mkv|avi)
      echo "shrinking video: $name"
      if [ -n "$FFMPEG" ]; then
        "$FFMPEG" -loglevel error -y -i "$src" -vf "scale=-2:'min(720,ih)'" -c:v libx264 -crf 26 -preset veryfast -an "$out/${name%.*}.mp4"
      elif command -v avconvert >/dev/null; then
        avconvert --source "$src" --output "$out/${name%.*}.mp4" --preset Preset1280x720 --replace >/dev/null
      else
        cp "$src" "$out/"
      fi ;;
    *) cp "$src" "$out/" ;;
  esac
}

for src in "$@"; do
  if [ -d "$src" ]; then
    src="${src%/}"; base="$(basename "$src")"; base="${base%% }"
    while IFS= read -r -d '' f; do
      rel="${f#"$src"/}"; send_file "$f" "$DEST/$base/$(dirname "$rel")"
    done < <(find "$src" -type f ! -name ".DS_Store" -print0)
  else
    send_file "$src" "$DEST"
  fi
done

big="$(find "$DEST" -type f -size +95M)"
if [ -n "$big" ]; then echo "Still too big for GitHub (over 95 MB):"; echo "$big"; exit 1; fi

cd "$REPO"
git add inbox
git commit -qm "inbox: $(basename "$1")"
git push -q origin "HEAD:$BRANCH"
echo "Sent to Claude -> ${DEST#"$REPO"/}"
echo "Now tell Claude: sent"
