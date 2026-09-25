---
name: inbox
description: Open files Dre sends from his Mac. Use whenever Dre says "sent", "pushed", "check inbox", "look at the file/folder/video I sent", or refers to a file that lives on his computer (Desktop, Downloads, etc.). The cloud session cannot see his Mac; his `sendclaude` command (scripts/send-to-claude.sh) pushes files into inbox/<timestamp>/ on the working branch.
---

# Inbox — files from Dre's Mac

The cloud container cannot read Dre's computer. He sends files with
`sendclaude <file-or-folder>` (see `scripts/send-to-claude.sh`), which copies
them into `inbox/<YYYYMMDD-HHMMSS>/`, shrinks videos to 720p, commits and pushes.

## When he says "sent" / "check inbox"

1. Pull the working branch:
   `git fetch origin <branch> && git merge --ff-only origin/<branch>`
   (branch = the one this session develops on).
2. Find the newest drop: `ls -1 inbox | sort | tail -1`, then list it with sizes.
3. Open by type:
   - **Images** (png/jpg/webp/heic): Read them directly.
   - **Video**: pull frames, don't guess. ffmpeg is at
     `/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2`
     (or `pip install imageio-ffmpeg` if missing).
     - Duration + streams: `ffmpeg -hide_banner -i clip.mp4`
     - Frames at 1 fps: `ffmpeg -i clip.mp4 -vf fps=1,scale=640:-1 frames/%04d.jpg`
     - Contact sheets (12 frames per sheet): `ffmpeg -i clip.mp4 -vf "fps=1,scale=480:-1,tile=4x3" sheet_%02d.jpg`
     - Scene cuts: `ffmpeg -i clip.mp4 -vf "select='gt(scene,0.3)',showinfo" -f null - 2>&1 | grep pts_time`
     - Read the sheets, then zoom into single frames where detail matters.
   - **Docs/code** (md, txt, pdf, csv, json, py, js): Read them.
4. Tell Dre in one line what arrived (names, sizes, durations), then do what he asked.

## If nothing arrived

Say so plainly and have him run, in Terminal on his Mac:
`sendclaude ` then drag the file into the window, Enter.
First-time setup (once):
```
cd ~/Agent-X && git pull && chmod +x scripts/send-to-claude.sh && echo 'alias sendclaude="$HOME/Agent-X/scripts/send-to-claude.sh"' >> ~/.zshrc && source ~/.zshrc
```

## Rules

- Reference material in the inbox (other people's videos, screenshots) is for
  study only: describe and learn from it, never republish or copy it shot for shot.
- Don't delete inbox drops unless Dre asks.
