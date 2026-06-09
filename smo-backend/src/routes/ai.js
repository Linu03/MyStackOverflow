const express = require('express');
const smoAi = require('../services/smoAi');
const { supabase } = require('../supabase');

const router = express.Router();

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

function findQuickDuplicates(title, questions) {
  const norm = normalizeTitle(title);
  if (norm.length < 10) return [];

  const matches = [];
  for (const q of questions) {
    const qNorm = normalizeTitle(q.title);
    if (qNorm === norm) {
      matches.push({ id: q.id, title: q.title });
      continue;
    }
    if (norm.length >= 15 && (qNorm.includes(norm) || norm.includes(qNorm))) {
      matches.push({ id: q.id, title: q.title });
    }
  }
  return matches;
}

router.post('/tags', async (req, res) => {
  const { title } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'title is required' });

  const result = await smoAi.suggestTags(title);
  if (result?.rateLimited) return res.status(429).json({ error: 'groq_rate_limited' });
  return res.json(result ?? { tags: [] });
});

router.post('/check-duplicate', async (req, res) => {
  const { title } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'title is required' });

  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, title')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !questions?.length) {
    return res.json({ isDuplicate: false, duplicateId: null, matches: [] });
  }

  const quickMatches = findQuickDuplicates(title.trim(), questions);
  if (quickMatches.length > 0) {
    return res.json({
      isDuplicate: true,
      duplicateId: quickMatches[0].id,
      matches: quickMatches,
    });
  }

  const result = await smoAi.checkDuplicate(title.trim(), questions);
  if (result?.rateLimited) return res.status(429).json({ error: 'groq_rate_limited' });

  return res.json(result ?? { isDuplicate: false, duplicateId: null, matches: [] });
});

router.get('/health', async (_req, res) => {
  const result = await smoAi.health();
  return res.json(result ?? { ok: false });
});

module.exports = router;
