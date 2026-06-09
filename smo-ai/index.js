import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import { MODEL, PROVIDER, sysMsg, chatComplete, parseJsonContent } from './llm.js';
import { logger } from './logger.js';

const INTERNAL_SECRET = process.env.SMO_AI_SECRET;
if (!INTERNAL_SECRET) {
  console.error('SMO_AI_SECRET is not set — all non-health requests will be rejected');
}

const app = express();
app.use(express.json());
app.use(cors());
app.use(morgan(':method :url :status :res[content-length] bytes - :response-time ms'));

app.use((req, res, next) => {
  if (req.path === '/health') return next();
  if (!INTERNAL_SECRET || req.headers['x-internal-secret'] !== INTERNAL_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
});

const PORT = process.env.PORT || 3100;

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_requests', message: 'Slow down — 30 requests per minute per IP.' },
});
app.use(limiter);

let rateLimitedUntil = 0;

function isRateLimited() {
  return Date.now() < rateLimitedUntil;
}

function getRetryAfter() {
  return Math.ceil((rateLimitedUntil - Date.now()) / 1000);
}

function tripCircuitBreaker(retryAfterSeconds = 300) {
  rateLimitedUntil = Date.now() + retryAfterSeconds * 1000;
  logger.warn(`Rate limit hit — circuit open for ${retryAfterSeconds}s`);
}

function rateLimitedResponse(res) {
  return res.status(429).json({ rateLimited: true, retryAfter: getRetryAfter() });
}

const TAGS_SYSTEM_PROMPT = `You are a tagging assistant for Stack my Overflow, a Q&A platform for software developers.
Your only job is to suggest relevant tags for a developer question based on its title.

Rules:
- Return between 3 and 5 tags
- Tags must be lowercase
- Use hyphens instead of spaces (e.g. "react-hooks" not "react hooks")
- Tags should reflect the technology, language, concept, or framework the question is about
- Do not use generic tags like "question", "help", "issue", "problem", "error"
- Prefer specific tags over vague ones (e.g. "useEffect" over "react")
- Output ONLY valid JSON. Format: {"tags": ["tag1", "tag2", "tag3"]}`;

function sanitizeInput(text, maxLength = 300) {
  return text
    .slice(0, maxLength)
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    .trim();
}

function sanitizeTags(tags) {
  return tags
    .filter((t) => typeof t === 'string')
    .map((t) => t.toLowerCase().trim().replace(/\s+/g, '-'))
    .slice(0, 5);
}

function isGroq429(err) {
  return err?.status === 429 || err?.message?.includes('429');
}

const DUPLICATE_SYSTEM_PROMPT = `You detect duplicate questions on a developer Q&A platform.
Compare the NEW title against EXISTING titles and find questions that ask essentially the same thing.

Rules:
- A match means same topic and intent, not just a shared keyword
- Return only IDs from the existing list — never invent IDs
- If nothing is similar enough, set isDuplicate to false and matches to []
- Output ONLY valid JSON in this format:
  {"isDuplicate": true, "duplicateId": "uuid-here", "matches": [{"id": "uuid", "title": "exact title from list"}]}`;

function validateDuplicateResult(parsed, existing) {
  const byId = new Map(existing.map((q) => [q.id, q.title]));
  const matches = (parsed.matches ?? [])
    .filter((m) => m?.id && byId.has(m.id))
    .map((m) => ({ id: m.id, title: byId.get(m.id) }));

  const duplicateId =
    parsed.duplicateId && byId.has(parsed.duplicateId)
      ? parsed.duplicateId
      : matches[0]?.id ?? null;

  return {
    isDuplicate: matches.length > 0,
    duplicateId,
    matches,
  };
}

app.post('/check-duplicate', async (req, res) => {
  if (isRateLimited()) return rateLimitedResponse(res);

  const { title, existing } = req.body;
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'title is required' });
  }
  if (!Array.isArray(existing)) {
    return res.status(400).json({ error: 'existing must be an array' });
  }

  const list = existing
    .filter((q) => q?.id && q?.title)
    .slice(0, 50)
    .map((q) => ({ id: q.id, title: sanitizeInput(q.title, 200) }));

  if (list.length === 0) {
    return res.json({ isDuplicate: false, duplicateId: null, matches: [] });
  }

  const normNew = sanitizeInput(title).toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
  const quickMatches = list.filter((q) => {
    const normQ = q.title.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
    return normQ === normNew || (normNew.length >= 15 && (normQ.includes(normNew) || normNew.includes(normQ)));
  });
  if (quickMatches.length > 0) {
    return res.json({
      isDuplicate: true,
      duplicateId: quickMatches[0].id,
      matches: quickMatches,
    });
  }

  const existingText = list.map((q) => `- id: ${q.id} | title: ${q.title}`).join('\n');

  try {
    const content = await chatComplete({
      messages: [
        sysMsg(DUPLICATE_SYSTEM_PROMPT),
        {
          role: 'user',
          content: `NEW title: "${sanitizeInput(title)}"\n\nEXISTING questions:\n${existingText}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 300,
    });

    const parsed = parseJsonContent(content);
    return res.json(validateDuplicateResult(parsed, list));
  } catch (err) {
    if (isGroq429(err)) {
      const retryAfter = parseInt(err?.headers?.['retry-after'] ?? '300', 10);
      tripCircuitBreaker(retryAfter);
      return rateLimitedResponse(res);
    }
    logger.error('/check-duplicate failed', { error: err.message });
    return res.json({ isDuplicate: false, duplicateId: null, matches: [] });
  }
});

const COMPANION_SYSTEM_PROMPT = `You are AI Companion on Stack my Overflow, a Q&A platform for software developers.
Read the question title and description and write a helpful technical answer.
Prefer answering — only use skip if the question is completely unrelated to software development.

Rules:
- Answer in clear markdown (short paragraphs, code blocks when useful)
- Be helpful but concise — 2 to 6 sentences unless code is needed
- Do not pretend to be human; you are an AI assistant
- Output ONLY valid JSON in one of these formats:
  {"answer": "your answer text here"}
  {"skip": true}`;

app.post('/companion', async (req, res) => {
  if (isRateLimited()) return rateLimitedResponse(res);

  const { title, description } = req.body;
  if (!title?.trim() || !description?.trim()) {
    return res.status(400).json({ error: 'title and description are required' });
  }

  try {
    const content = await chatComplete({
      messages: [
        sysMsg(COMPANION_SYSTEM_PROMPT),
        {
          role: 'user',
          content: `Title: "${sanitizeInput(title)}"\n\nDescription:\n${sanitizeInput(description, 1500)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 600,
    });

    let parsed;
    try {
      parsed = parseJsonContent(content);
    } catch {
      if (content?.trim().length > 30) {
        return res.json({ answer: content.trim() });
      }
      return res.json({ skip: true });
    }

    if (parsed.skip || !parsed.answer?.trim()) {
      return res.json({ skip: true });
    }

    return res.json({ answer: parsed.answer.trim() });
  } catch (err) {
    if (isGroq429(err)) {
      const retryAfter = parseInt(err?.headers?.['retry-after'] ?? '300', 10);
      tripCircuitBreaker(retryAfter);
      return rateLimitedResponse(res);
    }
    logger.error('/companion failed', { error: err.message });
    return res.json({ skip: true });
  }
});

app.post('/tags', async (req, res) => {
  if (isRateLimited()) return rateLimitedResponse(res);

  const { title } = req.body;
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'title is required' });
  }

  try {
    const content = await chatComplete({
      messages: [
        sysMsg(TAGS_SYSTEM_PROMPT),
        { role: 'user', content: `Question title: "${sanitizeInput(title)}"` },
      ],
      temperature: 0.2,
      max_tokens: 100,
    });

    const parsed = parseJsonContent(content);
    const tags = sanitizeTags(parsed.tags ?? []);
    return res.json({ tags });
  } catch (err) {
    if (isGroq429(err)) {
      const retryAfter = parseInt(err?.headers?.['retry-after'] ?? '300', 10);
      tripCircuitBreaker(retryAfter);
      return rateLimitedResponse(res);
    }
    logger.error('/tags failed', { error: err.message });
    return res.status(503).json({ tags: [], error: 'Tag service unavailable' });
  }
});

app.get('/health', (_req, res) => {
  if (isRateLimited()) {
    return res.json({ ok: false, rateLimited: true, retryAfter: getRetryAfter(), provider: PROVIDER, model: MODEL });
  }
  return res.json({ ok: true, rateLimited: false, provider: PROVIDER, model: MODEL });
});

app.listen(PORT, () => {
  logger.info(`smo-ai running on port ${PORT}`);
  logger.info(`Provider: ${PROVIDER} | Model: ${MODEL}`);
});
