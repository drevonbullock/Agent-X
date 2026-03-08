# Agent X

An autonomous LinkedIn content bot that generates and posts AI-crafted text + images on a schedule — no manual input required.

Built by **Drevon Bullock / Bullock Motion Labs**.

---

## What It Does

Agent X runs 3x per day (9 AM, 1 PM, 6 PM EST) and autonomously:

1. Selects a content type (`ai_tips`, `build_in_public`, or `philosophy`)
2. Generates a LinkedIn post (150–500 words) via Claude
3. Picks a visual mode — **Quote Card** or **AI Image** — based on the post's tone
4. Renders or generates the image (Puppeteer, Gemini Imagen 3, or DALL-E 3 fallback)
5. Uploads the image and publishes the post to LinkedIn via the REST API

Zero clicks. Fully automated.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Runtime | Node.js (ES Modules) |
| AI — Text | Anthropic Claude (`claude-sonnet-4-6`) |
| AI — Image (primary) | Google Gemini Imagen 3 |
| AI — Image (fallback) | OpenAI DALL-E 3 |
| Quote Card Rendering | Puppeteer (headless Chromium, inline HTML) |
| Scheduler | `node-cron` |
| HTTP | Native `fetch` (Node 18+) |
| LinkedIn Integration | LinkedIn REST API (OAuth 2.0) |
| Dev Environment | Claude Code CLI |

---

## MCP Stack

Agent X was built with Claude Code and the following MCP servers:

| MCP Server | Purpose |
|---|---|
| **UI UX Pro Max** | UI/UX design patterns and component guidance |
| **21st.dev Magic** | Rapid component scaffolding and visual layout generation |
| **Nano Banana** | Gemini Imagen 3 image generation (same model used in production) |

---

## Project Structure

```
agent/
  generate-post.js       — Claude-powered LinkedIn post generation
  generate-image.js      — Dual-mode image router (Quote vs Visual)
  post-to-linkedin.js    — LinkedIn REST API: image upload + post creation

auth/
  linkedin-auth.js       — One-time OAuth 2.0 browser flow

images/
  gemini.js              — Gemini Imagen 3 (cinematic 16:9, dark/orange)
  dalle.js               — DALL-E 3 fallback (1792x1024)
  render-quote-card.js   — Puppeteer quote card renderer (1200x675 @2x)

index.js                 — Main orchestrator
scheduler.js             — node-cron schedule (9 AM, 1 PM, 6 PM EST)
```

---

## Visual Modes

Claude reads each generated post and selects one of two image modes:

### Quote Card
Puppeteer renders a branded dark HTML card (1200x675 @2x).
- Orange accent bar, ghost quote mark
- Key phrase in large white type
- Author byline
- Best for: philosophy, opinions, build-in-public updates, punchy statements

### AI Image (Visual)
Gemini Imagen 3 generates a cinematic thematic illustration (16:9).
- Dark futuristic aesthetic with orange neon accents
- Falls back to DALL-E 3 if Gemini is unavailable
- Best for: AI tips, technical explainers, concept-heavy posts

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/yourusername/agent-x.git
cd agent-x
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
ANTHROPIC_API_KEY=        # Anthropic Console
OPENAI_API_KEY=           # OpenAI Platform (DALL-E 3 fallback)
GEMINI_API_KEY=           # Google AI Studio (Imagen 3)
LINKEDIN_CLIENT_ID=       # LinkedIn Developer Portal
LINKEDIN_CLIENT_SECRET=   # LinkedIn Developer Portal
LINKEDIN_ACCESS_TOKEN=    # Set automatically by auth flow (see below)
LINKEDIN_PERSON_URN=      # Set automatically by auth flow (see below)
```

### 3. Authorize LinkedIn (one-time)

```bash
node auth/linkedin-auth.js
```

This opens a browser OAuth flow and writes `LINKEDIN_ACCESS_TOKEN` and `LINKEDIN_PERSON_URN` to your `.env`. Re-run every ~60 days when the token expires.

---

## Running

```bash
# Test a single post end-to-end (no schedule):
node index.js --test

# Start the scheduled bot (9 AM, 1 PM, 6 PM EST):
node index.js
```

---

## Content Types

| Type | Description |
|---|---|
| `ai_tips` | Specific, actionable AI/automation insights |
| `build_in_public` | Raw updates on active projects (MLB betting AI, AI receptionist, content bots) |
| `philosophy` | Sharp takes on AI, building, and the future of work |

---

## Screenshots
<img width="1352" height="848" alt="Screenshot 2026-03-07 at 10 04 16 PM" src="https://github.com/user-attachments/assets/1c199453-c930-493f-93a1-0e08f633d82e" /><img width="1352" height="848" alt="Screenshot 2026-03-07 at 10 05 46 PM" src="https://github.com/user-attachments/assets/c5463dcc-7842-4883-b901-0ce34a7603d9" />
<img width="1352" height="848" alt="Screenshot 2026-03-07 at 10 05 41 PM" src="https://github.com/user-attachments/assets/2e4e75a4-7520-456b-b561-5d26883ad6c9" />
<img width="1352" height="848" alt="Screenshot 2026-03-07 at 10 05 12 PM" src="https://github.com/user-attachments/assets/16d0365a-21fc-4131-920b-5faa01dd171d" />
<img width="1352" height="848" alt="Screenshot 2026-03-07 at 10 05 05 PM" src="https://github.com/user-attachments/assets/ffa0ec3b-81a8-49b1-92a8-8dc304ca9a34" />
<img width="1352" height="848" alt="Screenshot 2026-03-07 at 10 04 26 PM" src="https://github.com/user-attachments/assets/5f99fe3b-5c73-4a7a-bd8d-0ab81d50d225" />


---

## Built By

**Drevon Bullock**
Bullock Motion Labs

> Automating content so founders can focus on building.
