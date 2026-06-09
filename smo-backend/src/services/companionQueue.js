const logger = require('../logger');
const { supabase } = require('../supabase');
const smoAi = require('./smoAi');

const queue = [];
let processing = false;

const COMPANION_USER_ID =
  process.env.AI_COMPANION_USER_ID || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

async function hasAcceptedAnswer(questionId) {
  const { data, error } = await supabase
    .from('answers')
    .select('id')
    .eq('question_id', questionId)
    .eq('is_accepted', true)
    .limit(1);

  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

async function processQuestion(questionId) {
  const { data: question, error } = await supabase
    .from('questions')
    .select('id, title, description, allow_ai_companion, is_solved')
    .eq('id', questionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!question?.allow_ai_companion) return;

  if (question.is_solved || (await hasAcceptedAnswer(questionId))) {
    logger.info('companion skipped — question already solved', { questionId });
    return;
  }

  let result = await smoAi.generateCompanionAnswer(question.title, question.description);
  if (!result?.answer?.trim()) {
    result = await smoAi.generateCompanionAnswer(question.title, question.description);
  }
  if (!result?.answer?.trim()) {
    logger.info('companion skipped — no answer from AI', { questionId });
    return;
  }

  const { error: insertError } = await supabase.from('answers').insert({
    question_id: questionId,
    author_id: COMPANION_USER_ID,
    body: result.answer.trim(),
    is_ai_generated: true,
  });

  if (insertError) throw new Error(insertError.message);

  logger.info('companion answer posted', { questionId });
}

async function processNext() {
  if (processing || queue.length === 0) return;

  processing = true;
  const questionId = queue.shift();

  try {
    await processQuestion(questionId);
  } catch (err) {
    logger.error('companion job failed', { questionId, error: err.message });
  } finally {
    processing = false;
    processNext();
  }
}

function enqueue(questionId) {
  if (!questionId) return;
  queue.push(questionId);
  processNext();
}

module.exports = { enqueue };
