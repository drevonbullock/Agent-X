# Agent X — Project Context for Claude

## What This Is
Agent X is an automated content generation and posting bot. It runs on a Node.js schedule (9 AM, 1 PM, 6 PM EST) and posts AI-generated content — text + image — to LinkedIn.

## Tech Stack
- Runtime: Node.js (ES Modules, `"type": "module"` in package.json)
- AI: Anthropic Claude via `@anthropic-ai/sdk` (text generation + image mode selection)
- Images: Gemini Imagen 3 (VISUAL mode, via REST API); Puppeteer + inline HTML (QUOTE mode); `openai` DALL-E 3 (VISUAL fallback)
- Scheduler: `node-cron`
- HTTP: Native `fetch` (Node 18+) — no Axios, no LinkedIn SDK
- Auth: Custom OAuth 2.0 one-time flow in `auth/linkedin-auth.js`

## Project Structure
```
agent/
  generate-post.js     — Generates text via Claude. Two exports:
                         generatePost(contentType)          → Twitter (280 chars, legacy)
                         generateLinkedInPost(contentType)  → LinkedIn (150–500 words)
  generate-image.js    — Dual-mode image router. Exports generateImage(postText) → Buffer (PNG)
                         1. Calls Claude to select QUOTE or VISUAL mode for the post
                         2. QUOTE MODE → renderQuoteCard (Puppeteer, branded dark card)
                         3. VISUAL MODE → generateGeminiImage (Imagen 3 cinematic illustration)
                            Falls back to DALL-E 3 if Gemini is unavailable
  post-to-linkedin.js  — Uploads image + creates post via LinkedIn REST API
                         Returns { postId, postUrl }

auth/
  linkedin-auth.js     — One-time OAuth 2.0 browser flow. Run manually once.
                         Writes LINKEDIN_ACCESS_TOKEN and LINKEDIN_PERSON_URN to .env

images/
  gemini.js            — Gemini Imagen 3 image generation (16:9, cinematic dark/orange aesthetic)
                         Uses GEMINI_API_KEY. Same model as nano-banana MCP tool.
  dalle.js             — DALL-E 3 image generation (1792x1024, dark/cosmic aesthetic) — fallback
  render-quote-card.js — Puppeteer screenshot of inline HTML quote card (1200x675 @2x)
  quote-card.js        — Canvas quote card (legacy, unused in main flow)
  chart.js             — ChartJS chart (1200x675, picks from 4 preset datasets)

index.js               — Orchestrates: generateLinkedInPost → generateImage → postToLinkedIn
scheduler.js           — Runs runAgent() at 9 AM, 1 PM, 6 PM EST via node-cron
```

## LinkedIn API Notes
- API Base: `https://api.linkedin.com/rest/`
- Posts endpoint: `POST /rest/posts`
- Image upload: two-step — initialize upload (`POST /rest/images?action=initializeUpload`), then `PUT` binary to the returned signed URL
- **Important**: Do NOT send `Authorization` header when uploading to the signed URL — it is pre-signed
- Post ID is in the HTTP response header `x-restli-id`, not the response body (body is empty on 201)
- Person URN format: `urn:li:person:XXXXXXXXX` (stored in .env as `LINKEDIN_PERSON_URN`)
- Access tokens expire after ~60 days. Re-run `node auth/linkedin-auth.js` to refresh.
- Required scopes: `openid profile w_member_social`
- All `/rest/` calls require: `LinkedIn-Version: 202501` and `X-Restli-Protocol-Version: 2.0.0`

## Environment Variables Required
```
ANTHROPIC_API_KEY=
OPENAI_API_KEY=              ← DALL-E 3 fallback (VISUAL mode)
GEMINI_API_KEY=              ← Imagen 3 primary (VISUAL mode) — from Google AI Studio
LINKEDIN_CLIENT_ID=          ← from LinkedIn Developer Portal
LINKEDIN_CLIENT_SECRET=      ← from LinkedIn Developer Portal
LINKEDIN_ACCESS_TOKEN=       ← set by auth/linkedin-auth.js
LINKEDIN_PERSON_URN=         ← set by auth/linkedin-auth.js
```

## Image Modes
Claude reads each generated post and picks one of two visual modes:

- **QUOTE MODE** — Puppeteer renders a branded dark HTML card (1200x675 @2x).
  Orange accent bar, ghost quote mark, key phrase in large white text, author byline.
  Best for: philosophy, opinions, build-in-public updates, punchy statements.

- **VISUAL MODE** — Gemini Imagen 3 generates a cinematic thematic illustration (16:9).
  Dark futuristic aesthetic, orange neon accents. Falls back to DALL-E 3 if Gemini fails.
  Best for: ai_tips, technical explainers, concept-heavy posts.

## Content Types
- `ai_tips` — Specific, actionable AI/automation insights (image: usually VISUAL)
- `build_in_public` — Raw updates on active projects: MLB betting AI, AI receptionist, content bots (image: usually QUOTE)
- `philosophy` — Sharp takes on AI, building, and the future of work (image: usually QUOTE)

## Running
```bash
# First-time LinkedIn authorization (run once, opens browser):
node auth/linkedin-auth.js

# Test a single run:
node index.js --test

# Start scheduled bot (9 AM, 1 PM, 6 PM EST):
node index.js
```

## Key Conventions
- All files use ES Module syntax (`import`/`export`, no `require`)
- No new npm packages unless strictly necessary — use native Node.js APIs
- LinkedIn post text targets 150–400 words (max ~3000 chars)
- `postToLinkedIn` returns `{ postId, postUrl }` — mirrors shape of old `postTweet` return
- Errors logged with `[LinkedIn]` prefix, consistent with project-wide `[Agent X]` / `[Twitter]` pattern
- `generatePost()` (Twitter/280 char) is kept in generate-post.js but not called by index.js
