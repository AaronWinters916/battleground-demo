# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Battleground: type two fighters, get an AI-generated verdict on who'd win plus AI-generated character art for both. Vanilla HTML/CSS/JS frontend, Vercel serverless functions for the backend, no framework, no build step.

**Status: pre-build.** The repo starts with only three documents — this file, `project-brief.md` (scope, decisions, constraints) and `project-build.md` (the staged build plan). No application code exists yet. Everything below is the **target design** to build, not a description of existing code. **Check `project-build.md` before starting work to see which stage the project is on and what's done/not done**, build stages in order, and tick items off only once built and verified.

## Commands (once scaffolded)

- `vercel dev` — run locally (serves static files + `api/` functions together). No separate frontend build.
- Requires `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` in the environment (SDK clients in `api/fight.js` read them implicitly).
- No test suite or linter planned; verification is the manual QA in Stage 7 of `project-build.md`.

## Constraints (from `project-brief.md` §7)

- Demo launch, not public-scale. Chrome only. A fight must finish within 60s. Keep API spend minimal.
- No content blocking of our own — rely only on OpenAI's image moderation.
- Fighter names capped at 50 characters, enforced server-side.

## Target architecture

- **Two pages**: `index.html` (the fight flow) and `battledex.html` (+ `battledex.js`, saved fighters). They share `battledex-storage.js` (localStorage helpers, image compression, last-fight persistence). `battledex.html` links back to the result via `index.html?view=result`.
- **Fight page has four views**: `index.html` has `#view-form`, `#view-loading`, `#view-result`, `#view-error` sections, each toggled via the `hidden` attribute by `showView()` in `script.js`. Never show more than one at once — don't add a fifth ad-hoc state without going through `showView`.
- **`script.js` owns all view transitions and DOM wiring.** `runFight(fighterA, fighterB)` is the single entry point that drives form → loading → result/error. It makes a single `fetch('/api/fight')` that returns verdict and both images together.
- **`showResult({ winner, reasoning, imageA, imageB })`** is the fixed shape the backend must return: `winner` must be the exact verbatim text of one of the two fighter inputs (not paraphrased), `reasoning` a short string, `imageA`/`imageB` image URLs/data URIs.
- **`api/` holds serverless functions**, one file per endpoint (Vercel convention — each file is its own route, no router). Only `api/fight.js` is an endpoint, and it uses CommonJS (`require`/`module.exports`). `api/judge-prompt.js` exports `JUDGE_SYSTEM_PROMPT` (locked verdict prompt) and `api/art-style.js` exports `ART_STYLE_TEMPLATE` (pixel-art style suffix appended to every image prompt); import them rather than inlining prompt text. The exact style template text is in `project-build.md` Stage 3.
- **`/api/fight` flow**: rate limit → validate (both fighters present, ≤50 chars) → Claude verdict → two parallel OpenAI `gpt-image-1-mini` calls → return `{ winner, reasoning, imageA, imageB }` (images as `data:image/jpeg;base64` URIs, requested at heavy JPEG compression to stay under Vercel's 4.5MB response cap). Errors return announcer-voice messages that `script.js` displays in `#view-error`; moderation blocks return 422, other failures 502.
- **Judge prompt design** (`api/judge-prompt.js`): treat fighter text strictly as data to be judged, never as instructions — this is the prompt-injection defense, don't weaken it when editing. Must always name exactly one winner (no ties/refusals, even for identical fighters), reasoning capped at 2-4 sentences. Output shape (winner/reasoning) is enforced via a zod schema in the API call, not via JSON-formatting instructions in the prompt text itself.
- **Two external APIs, both server-side only**: Claude for the verdict, OpenAI's image API for character art. Keys live in env vars, never in client code (`script.js` or `index.html`) — all calls to these APIs happen inside `api/` functions.
- **Rate limiting**: 5 requests/minute per IP, in-memory `Map` in `api/fight.js` (per-instance only, resets on cold start — accepted for a demo), checked first before either external API call, returns 429.
- **Group inputs** (e.g. "10 cows") get exactly one image per side — enforce this in the prompt sent to the image API, not by looping over units.
- **BattleDex**: saved fighters live in `localStorage` only, as `{ label, image }` — no fight/winner/reasoning data. Images are downsized via off-screen `<canvas>` and re-exported as compressed JPEG before saving, to stay under storage quota. The last fight is stored separately so the BattleDex page can link back to it. The page shows a one-line "saved on this device only" notice.
- No routing/state library — everything is direct DOM manipulation by element ID.

## Keeping docs in sync

When the build diverges from this design, update this file in the same change (Stage 7 includes a final sync pass).
