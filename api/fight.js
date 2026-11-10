const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const { zodOutputFormat } = require('@anthropic-ai/sdk/helpers/zod');
const { z } = require('zod');
const { JUDGE_SYSTEM_PROMPT, buildJudgeUserMessage } = require('./judge-prompt');
const { ART_STYLE_TEMPLATE } = require('./art-style');

// SDK clients read ANTHROPIC_API_KEY / OPENAI_API_KEY from the environment.
const anthropic = new Anthropic();
const openai = new OpenAI();

const MAX_FIGHTER_LENGTH = 50;
const VERDICT_MODEL = 'claude-sonnet-5-5';
const IMAGE_MODEL = 'gpt-image-1-mini'; // gpt-image-1 is retired; mini is the cheapest current model

const Verdict = z.object({ winner: z.string(), reasoning: z.string() });

// Rate limit: 5 requests/minute per IP. In-memory, per instance, resets on
// cold start. Accepted limitation for a demo (project-brief.md §7).
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 1000;
const hits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

// A group ("10 cows") is still ONE image: the prompt says so, no looping.
function imagePrompt(fighter) {
  return `A single image of: ${fighter}. If this is a group or crowd, show the whole group together inside one single image. ${ART_STYLE_TEMPLATE}`;
}

async function generateImage(fighter) {
  const result = await openai.images.generate({
    model: IMAGE_MODEL,
    prompt: imagePrompt(fighter),
    size: '1024x1024',
    quality: 'low', // keeps API spend minimal (brief §7)
    n: 1,
  });
  return `data:image/png;base64,${result.data[0].b64_json}`;
}

function isModerationBlock(err) {
  return err?.code === 'moderation_blocked' || err?.error?.code === 'moderation_blocked';
}

function fail(res, status, error) {
  return res.status(status).json({ error });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return fail(res, 405, 'The announcer only takes POST requests at this arena.');
  }

  // 1. Rate limit first, before any paid API call.
  if (isRateLimited(clientIp(req))) {
    return fail(res, 429, 'Easy there, champ! The arena crew needs a minute to reset the ring. Try again shortly.');
  }

  // 2. Validate.
  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  const { fighterA, fighterB } = body || {};
  if (typeof fighterA !== 'string' || typeof fighterB !== 'string' || !fighterA.trim() || !fighterB.trim()) {
    return fail(res, 400, 'Both corners need a fighter before the bell can ring!');
  }
  if (fighterA.length > MAX_FIGHTER_LENGTH || fighterB.length > MAX_FIGHTER_LENGTH) {
    return fail(res, 400, `Fighter names top out at ${MAX_FIGHTER_LENGTH} characters. Keep it snappy!`);
  }

  // 3. Verdict.
  let verdict;
  try {
    const response = await anthropic.messages.parse({
      model: VERDICT_MODEL,
      max_tokens: 600,
      system: JUDGE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildJudgeUserMessage(fighterA, fighterB) }],
      output_config: { format: zodOutputFormat(Verdict) },
    });
    verdict = response.parsed_output;
    if (!verdict || (verdict.winner !== fighterA && verdict.winner !== fighterB)) {
      throw new Error('Verdict winner was not one of the fighters');
    }
  } catch (err) {
    console.error('Verdict failed:', err?.message);
    return fail(res, 502, 'The judges dropped their scorecards! The verdict fell through. Give it another go.');
  }

  // 4. Art: two images in parallel, exactly one per side.
  try {
    const [imageA, imageB] = await Promise.all([generateImage(fighterA), generateImage(fighterB)]);
    return res.status(200).json({ winner: verdict.winner, reasoning: verdict.reasoning, imageA, imageB });
  } catch (err) {
    console.error('Image generation failed:', err?.code || err?.message);
    if (isModerationBlock(err)) {
      return fail(res, 422, 'The ring inspectors blocked one of those fighters! Try a different challenger.');
    }
    return fail(res, 502, 'The portrait artists tripped on the way to the ring! The art fell through. Give it another go.');
  }
};

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
