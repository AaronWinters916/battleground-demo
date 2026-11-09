# Battleground — Project Brief
## 1. What are we actually building? (Scope)

A web app where you type in two fighters and get an AI generated verdict on who'd win, plus AI generated character art for both.

## 2. What's the smallest, simplest version worth shipping (MVP)?

Two text inputs, a Fight button, a working verdict with art, a loading state while we wait on the API, and a basic BattleDex saved to localStorage. Type two fighters, get a real result, save it if you want.

## 3. What are we building this with (tech stack)?

HTML, CSS, and vanilla JS for the frontend. Vercel for hosting and serverless functions. Claude's API for the verdict. OpenAI's image API for the character art. localStorage for saving BattleDex.

## 4. What's the long-term vision, beyond just the MVP?

I would eventually like a real backend where BattleDex characters sync across devices instead of just living in localStorage. I'd also want a quick re-fight option using characters already saved in the BattleDex, instead of typing two new ones every time.

## 5. Details decided so far

- **Rate limiting**: 5 requests per minute per IP.
- **Verdict format**: winner card with animation, plus written reasoning for the win.
- **Character art**: one image per side. Group inputs (e.g. "10 cows vs 10 lions") still get one image per side, not one per unit.
- **Image storage**: images downsized/compressed client-side (canvas resize + JPEG/WebP quality) before saving to localStorage, to stay under browser storage quota.
- **Fighter input limit**: each fighter name is capped at 50 characters, enforced server-side.
- **Art style**: every image follows one shared 16-bit pixel-art template (retro sprite style, limited palette, centered subject on a plain solid background, no text/logos/borders). See `project-build.md` Stage 3 for the full template.

## 6. Project documents and starting state

This is a tutorial build that starts with three core documents and no application code:

- `CLAUDE.md` — guidance for Claude Code (architecture, conventions, commands). Describes the target design until the code exists.
- `project-brief.md` — this file: scope, stack, and decisions.
- `project-build.md` — the staged build plan; the source of truth for progress. Check it before starting any work.

All application code (frontend, `api/` functions, BattleDex, dependencies) is built from scratch following the stages in `project-build.md`.

## 7. Launch type, cost, and constraints

- **Launch type**: demo, not a public launch. Not built to withstand abuse at scale.
- **Rate limiting**: the in-memory per-IP limiter (resets on cold start, per-instance only) is an accepted limitation for a demo. No external store (Upstash/Vercel KV) for now.
- **Cost**: keep API spend as minimal as feasible. Every fight = 1 Claude call + 2 `gpt-image-1` calls. No global daily cap for now. Set spend limits in the OpenAI and Anthropic dashboards before sharing the link (to be confirmed by the owner).
- **Performance target**: a fight (verdict + both images) should complete in 60 seconds or less. Measure during Stage 7 QA; treat anything over 60s as a failure state to handle.
- **Browser support**: Chrome only. Other browsers and mobile Safari are not tested or guaranteed.
- **Content policy**: no blocking of real people, copyrighted characters, or offensive terms on our side. We rely only on OpenAI's built-in image moderation (the existing 422 announcer-voice error path).
- **BattleDex persistence**: localStorage only. The UI shows a one-line notice that fighters are saved on this device only. No export/import for now.