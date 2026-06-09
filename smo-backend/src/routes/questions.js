const express = require('express');
const router = express.Router();
const { supabase } = require('../supabase');
const { requireAuth } = require('../middleware/auth');

// GET /api/questions - ruta publica
// Returneaza lista de intrebari in formatul QuestionSummary asteptat de frontend
router.get('/', async (req, res) => {
    const { data: questions, error } = await supabase
        .from('questions')
        .select(`
            id,
            title,
            is_solved,
            vote_count,
            created_at,
            author:profiles!author_id (
                id,
                username
            ),
            question_tags (
                tag:tags (
                    name
                )
            ),
            answer_count:answers(count)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('GET /questions error:', error.message);
        return res.status(500).json({ error: error.message });
    }

    // Supabase returneaza answer_count ca [{ count: N }], il normalizam
    const normalized = questions.map((q) => ({
        ...q,
        answer_count: q.answer_count[0]?.count ?? 0,
    }));

    return res.status(200).json(normalized);
});

// GET /api/questions/:id - ruta publica
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    // 1. Fetch intrebarea cu answers
    const { data: question, error } = await supabase
        .from('questions')
        .select(`
            id,
            title,
            description,
            author_id,
            is_solved,
            vote_count,
            created_at,
            author:profiles!author_id (
                id,
                username
            ),
            question_tags (
                tag:tags (
                    name
                )
            ),
            answers (
                id,
                body,
                question_id,
                author_id,
                vote_count,
                is_accepted,
                created_at,
                author:profiles!author_id (
                    id,
                    username
                )
            )
        `)
        .eq('id', id)
        .single();

    if (error) {
        console.error('GET /questions/:id error:', error.message);
        if (error.code === 'PGRST116') {
            return res.status(404).json({ error: 'Question not found' });
        }
        return res.status(500).json({ error: error.message });
    }

    // 2. Fetch comments separat (comments foloseste target_id/target_type, nu FK direct)
    const answerIds = question.answers.map(a => a.id);

    const [questionCommentsRes, answerCommentsRes] = await Promise.all([
        // Comments pe intrebare
        supabase
            .from('comments')
            .select(`
                id, body, target_id, target_type, created_at,
                author:profiles!author_id ( username )
            `)
            .eq('target_id', id)
            .eq('target_type', 'question'),

        // Comments pe answers (daca exista answers)
        answerIds.length > 0
            ? supabase
                .from('comments')
                .select(`
                    id, body, target_id, target_type, created_at,
                    author:profiles!author_id ( username )
                `)
                .in('target_id', answerIds)
                .eq('target_type', 'answer')
            : Promise.resolve({ data: [], error: null }),
    ]);

    if (questionCommentsRes.error) {
        console.error('Comments fetch error:', questionCommentsRes.error.message);
    }

    // 3. Atasam comments la fiecare answer
    const answersWithComments = question.answers.map(answer => ({
        ...answer,
        comments: (answerCommentsRes.data ?? []).filter(c => c.target_id === answer.id),
    }));

    return res.status(200).json({
        ...question,
        answers: answersWithComments,
        comments: questionCommentsRes.data ?? [],
    });
});


router.post('/', requireAuth, async (req, res) => {
    const { title, description, tags } = req.body;
    const author_id = req.user.id; // vine din token, nu din body

    // Validare campuri obligatorii
    if (!title || typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({ error: 'title is required' });
    }
    if (!description || typeof description !== 'string' || description.trim() === '') {
        return res.status(400).json({ error: 'description is required' });
    }
    if (title.trim().length < 10) {
        return res.status(400).json({ error: 'title must be at least 10 characters' });
    }

    // tags trebuie sa fie array de stringuri (optional, default [])
    const tagList = Array.isArray(tags) ? tags.map(t => t.trim()).filter(Boolean) : [];

    // 1. Cream intrebarea
    const { data: question, error: questionError } = await supabase
        .from('questions')
        .insert({
                title: title.trim(),
                description: description.trim(),
                author_id,
            })
        .select('id, title, description, is_solved, vote_count, created_at, author_id')
        .single();

    if (questionError) {
        return res.status(500).json({ error: questionError.message });
    }

    // 2. Procesam tagurile daca exista
    if (tagList.length > 0) {
        // Upsert taguri: insert daca nu exista, ignora daca exista (on conflict: name)
        const { data: upsertedTags, error: tagsError } = await supabase
            .from('tags')
            .upsert(
                tagList.map(name => ({ name })),
                { onConflict: 'name' }
            )
            .select('id, name');

        if (tagsError) {
            return res.status(500).json({ error: 'Failed to process tags' });
        }

        // 3. Legam tagurile de intrebare in question_tags
        const questionTagsRows = upsertedTags.map(tag => ({
            question_id: question.id,
            tag_id: tag.id,
        }));

        const { error: linkError } = await supabase
            .from('question_tags')
            .insert(questionTagsRows);

        if (linkError) {
            return res.status(500).json({ error: 'Failed to link tags to question' });
        }
    }

    return res.status(201).json({ ...question, question_tags: tagList.map(name => ({ tag: { name } })) });
});

// PATCH /api/questions/:id/vote - ruta protejata
// body: { value: 1 | -1 }
router.patch('/:id/vote', requireAuth, async (req, res) => {
    const { id } = req.params;
    const user_id = req.user.id;
    const { value } = req.body;

    // Validare: value trebuie sa fie 1 sau -1
    if (value !== 1 && value !== -1) {
        return res.status(400).json({ error: 'value must be 1 (upvote) or -1 (downvote)' });
    }

    // 1. Verificam daca userul a mai votat pe aceasta intrebare
    const { data: existingVote, error: fetchError } = await supabase
        .from('votes')
        .select('id, value')
        .eq('user_id', user_id)
        .eq('target_id', id)
        .eq('target_type', 'question')
        .maybeSingle();

    if (fetchError) {
        return res.status(500).json({ error: fetchError.message });
    }

    let voteDelta = 0;

    if (existingVote) {
        if (existingVote.value === value) {
            // Acelasi vot → anulezi (stergi votul)
            const { error: deleteError } = await supabase
                .from('votes')
                .delete()
                .eq('id', existingVote.id);

            if (deleteError) return res.status(500).json({ error: deleteError.message });

            voteDelta = -value; // era +1, scadem 1
        } else {
            // Vot opus → schimbi
            const { error: updateError } = await supabase
                .from('votes')
                .update({ value })
                .eq('id', existingVote.id);

            if (updateError) return res.status(500).json({ error: updateError.message });

            voteDelta = value * 2; // era -1, devine +1 → delta = +2
        }
    } else {
        // Vot nou → insert
        const { error: insertError } = await supabase
            .from('votes')
            .insert({ user_id, target_id: id, target_type: 'question', value });

        if (insertError) return res.status(500).json({ error: insertError.message });

        voteDelta = value;
    }

    // 2. Actualizam vote_count pe intrebare
    const { data: current, error: currentError } = await supabase
        .from('questions')
        .select('vote_count')
        .eq('id', id)
        .single();

    if (currentError) return res.status(500).json({ error: currentError.message });

    const { error: updateCountError } = await supabase
        .from('questions')
        .update({ vote_count: (current.vote_count ?? 0) + voteDelta })
        .eq('id', id);

    if (updateCountError) return res.status(500).json({ error: updateCountError.message });

    // 3. Returnam noul vote_count si starea votului curent
    const userVote = existingVote?.value === value ? 0 : value;

    return res.status(200).json({
        vote_count: (current.vote_count ?? 0) + voteDelta,
        user_vote: userVote, // 0 = anulat, 1 = upvote, -1 = downvote
    });
});

module.exports = router;
