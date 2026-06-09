const express = require('express');
const router = express.Router();
const { supabase } = require('../supabase');
const { requireAuth } = require('../middleware/auth');

// PATCH /api/answers/:id/accept - doar autorul intrebarii poate accepta
router.patch('/:id/accept', requireAuth, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    // 1. Luam raspunsul impreuna cu intrebarea parinte
    const { data: answer, error: fetchError } = await supabase
        .from('answers')
        .select(`
            id,
            body,
            question_id,
            author_id,
            vote_count,
            is_accepted,
            created_at,
            question:questions!question_id (
                id,
                author_id
            )
        `)
        .eq('id', id)
        .single();

    if (fetchError) {
        if (fetchError.code === 'PGRST116') {
            return res.status(404).json({ error: 'Answer not found' });
        }
        return res.status(500).json({ error: fetchError.message });
    }

    // 2. Doar autorul intrebarii poate accepta
    if (answer.question.author_id !== userId) {
        return res.status(403).json({ error: 'Only the question author can accept answers' });
    }

    // 3. Dezacceptam orice alt raspuns acceptat pe aceeasi intrebare
    const { error: unacceptError } = await supabase
        .from('answers')
        .update({ is_accepted: false })
        .eq('question_id', answer.question_id)
        .eq('is_accepted', true);

    if (unacceptError) {
        return res.status(500).json({ error: unacceptError.message });
    }

    // 4. Acceptam raspunsul curent si marcam intrebarea ca rezolvata
    const { data: updated, error: acceptError } = await supabase
        .from('answers')
        .update({ is_accepted: true })
        .eq('id', id)
        .select(`
            id,
            body,
            question_id,
            author_id,
            vote_count,
            is_accepted,
            created_at,
            author:profiles!author_id ( id, username )
        `)
        .single();

    if (acceptError) {
        return res.status(500).json({ error: acceptError.message });
    }

    const { error: solveError } = await supabase
        .from('questions')
        .update({ is_solved: true })
        .eq('id', answer.question_id);

    if (solveError) {
        return res.status(500).json({ error: solveError.message });
    }

    return res.status(200).json({ ...updated, comments: [] });
});

module.exports = router;
