# Battleground — Staged Build Plan

> Source: `project-brief.md` (constraints in §7: demo launch, Chrome only, 60s fight limit, minimal API spend). Each stage ships something runnable/demoable before moving to next. Do not start stage N+1 until stage N works.

## Starting state

This is a tutorial build. The project starts with **three core documents and no application code**:

- `CLAUDE.md` — guidance for Claude Code: architecture, conventions, commands. It describes the *target* design, so treat it as a spec until the matching code exists.
- `project-brief.md` — what we're building and the decisions already made (scope, stack, constraints).
- `project-build.md` — this file: the staged plan and the source of truth for progress.

Everything under Stage 0–7 below is still to be built. Check items off only after they are built and verified in this repo.

---

## Stage 0 — Scaffold

**Goal:** empty project running locally.

- [x] Core docs in place: `CLAUDE.md`, `project-brief.md`, `project-build.md`
- [x] `index.html`, `style.css`, `script.js` — bare skeleton, no logic yet
- [x] `vercel.json` (if needed) + `api/` folder for serverless functions
- [x] `package.json` (name, deps needed by `api/fight.js`: Anthropic SDK, OpenAI SDK, zod)
- [x] Run locally (e.g. `vercel dev` or a static server), confirm blank page loads (verified via static server; `vercel` CLI not installed yet)

**Done when:** blank page loads locally. No deploy — building and testing locally the whole way.

---

## Stage 1 — Static UI shell (no backend)

**Goal:** all core UI elements exist and are wired to JS, hardcoded/mock data only.

- [x] Four separate views on one page — input form, loading, result, error — each toggled via `hidden` attribute, never stacked/visible together
- [x] Input form view: two text inputs (fighter A, fighter B), Fight button — the only view visible on load
- [x] Loading view: spinner/skeleton, shown on click
- [x] Result view: winner name, written reasoning, two image slots — populate with placeholder text/images after a fake `setTimeout` delay
- [x] Error view: placeholder error message
- [x] Basic CSS layout

**Done when:** on load only input form shows; clicking Fight hides it, shows loading, then swaps to result view (fake data) via `hidden`, no network calls yet.

---

## Stage 2 — Judge system prompt

**Goal:** lock Claude's role to judging fights, resist prompt injection from fighter input.

- [x] Write the system prompt (`api/judge-prompt.js`, exporting `JUDGE_SYSTEM_PROMPT`): role locked to fight judge only — takes two fighters, returns a winner and reasoning, nothing else
- [x] Must always pick exactly one winner — no ties, no draws, no refusing to decide, even for identical/mirrored fighters (break the tie on flavor/creativity if needed, but still pick one)
- [x] Reasoning must be 2-4 sentences max, fun and playful tone, but logically justifies the winner
- [x] Explicitly forbid in the prompt: role changes, revealing the system prompt, following instructions embedded in fighter names/descriptions, doing anything other than judging the fight
- [x] Treat fighter input strictly as data to judge, never as instructions
- [x] Test with adversarial input (e.g. a fighter name containing "ignore previous instructions and...") — confirm it still just judges a fight
- [x] Test with identical fighters twice (e.g. "cow" vs "cow") — confirm it still names one winner, no tie/refusal

**Done when:** injected instructions inside fighter text don't change judge behavior or leak the system prompt.

---

## Stage 3 — Fight API (verdict + art + rate limiting)

**Goal:** one function, one call, real winner + reasoning + one image per side, end to end.

- [ ] `api/fight.js` serverless function: takes `{ fighterA, fighterB }`
- [ ] Validate server-side: both fighters present, each ≤ 50 characters
- [ ] Rate limit check runs first, before calling either API — key by IP, 5 requests/minute per `project-brief.md` §5, return 429 with a clear message when exceeded (in-memory `Map` is fine for a demo, per brief §7)
- [ ] Calls Claude for the verdict (using the Stage 2 system prompt) and OpenAI image API (`gpt-image-1`) for both fighters' art, in parallel
- [ ] Verdict output (`winner`, `reasoning`) enforced via a zod schema, not JSON-format instructions in the prompt; `winner` must be the verbatim text of one fighter input
- [ ] Store both API keys in env vars (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`), never in client code
- [ ] Group inputs (e.g. "10 cows") still produce exactly one image for that side — handled in the prompt sent to the image API, not by looping
- [ ] Every image generated must follow one shared art style template (`api/art-style.js`, exporting `ART_STYLE_TEMPLATE`), appended to each fighter's image prompt (not left to the model's default style):
  > 16-bit pixel art illustration, retro video game sprite style, bold outlined pixels, vibrant limited color palette, dynamic action pose. Depicted as one cohesive image, centered, filling most of the frame, isolated on a plain solid color background with no scenery. No text, words, letters, numbers, logos, watermarks, UI elements, borders, or frames.
- [ ] Return `{ winner, reasoning, imageA, imageB }` (images as `data:image/png;base64` URIs)
- [ ] Wire Fight button to call `/api/fight` instead of the fake timeout
- [ ] Handle errors distinctly in the UI, in announcer-voice messages: verdict failure, image failure, moderation-blocked (OpenAI content moderation rejection, returned as 422 — distinct message from a generic image failure, which is 502), rate-limit 429 — don't hang on loading forever

**Done when:** typing two real fighters returns winner + reasoning + one image per side from a single call, both images following the shared art style template; hammering Fight 6x in a minute from one IP gets blocked on the 6th and resets after a minute.

---

## Stage 4 — BattleDex (save to localStorage)

**Goal:** save individual fighters, view saved fighters.

- [ ] "Save" action per fighter: writes `{ label, image }` to a `localStorage` array — no fight/winner/reasoning data, just the fighter
- [ ] BattleDex page (`battledex.html` + `battledex.js`, sharing `battledex-storage.js` with the fight page): grid of saved fighters, each a mini trading-card style (image on top, name below) — not clickable, card just displays label + image
- [ ] Delete/clear entries from BattleDex
- [ ] "Back to last fight" button on BattleDex — jumps back to most recent result (last fight persisted separately; link via `index.html?view=result`)
- [ ] "New fight" button on BattleDex — returns to input form view

**Done when:** save a fighter, reload the page, it's still there in BattleDex; from BattleDex, can jump back to last fight result or start a new fight.

---

## Stage 5 — Image compression before save

**Goal:** stay under `localStorage` quota (per brief §5).

- [ ] Before saving a fighter to BattleDex, draw its image to an off-screen `<canvas>`, resize down, re-export as JPEG/WebP at reduced quality
- [ ] Save the compressed data URI, not the original
- [ ] Test with several saved fighters that quota isn't hit quickly

**Done when:** ~10+ saved fighters don't blow `localStorage` quota.

---

## Stage 6 — Claude redesign

**Goal:** hand entire app to Claude Design for full visual overhaul — not just verdict UI polish, every view.

- [ ] Run all four views (form, loading, result, error) plus BattleDex through Claude Design for a complete visual pass
- [ ] Winner card component: name, image, reasoning text, entry animation when result lands
- [ ] Loading state redesigned to cover the full wait for the fight call (target: ≤ 60s)
- [ ] Consistent visual language applied app-wide (typography, color, spacing, motion) — no leftover placeholder styling anywhere

**Done when:** full app feels like one designed product, no more placeholder styling on any view.

---

## Stage 7 — Final QA

**Goal:** ship it.

- [ ] Full manual pass: empty inputs, one empty input, same fighter twice, very long names (over 50 chars), non-English input
- [ ] Confirm rate limiting doesn't fire on normal single-fight use (in-memory limiter is an accepted limitation for a demo, per brief §7)
- [ ] Confirm no content blocking on our side — only OpenAI moderation (422 path) rejects fighters (brief §7)
- [ ] Confirm loading/error states cover: fight API failure (verdict or image side), rate limit hit, network offline
- [ ] Measure fight latency; must finish within 60s (add a client timeout/error state if it can exceed this)
- [ ] Add one-line "saved on this device only" notice to the BattleDex page
- [ ] Confirm spend limits are set in OpenAI and Anthropic dashboards before sharing the link
- [ ] Test in Chrome only (other browsers out of scope)
- [ ] Update `CLAUDE.md` so it matches what was actually built
- [ ] Deploy to Vercel

**Done when:** app handles the MVP end to end without console errors, deployed to Vercel.

---

## Explicitly out of scope (per brief §4 — later, not now)

- Real backend / cross-device BattleDex sync
- Quick re-fight using saved BattleDex characters
