const express = require('express');
const router = express.Router();
const { supabase, createAuthClient } = require('../supabase');

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    // 1. Verificam ca toate campurile exista
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'username, email and password are required' });
    }

    // 2. Verificam ca username-ul nu e deja luat
    const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();

    if (profileCheckError) {
        return res.status(500).json({ error: 'Database error while checking username' });
    }

    if (existingProfile) {
        return res.status(409).json({ error: 'Username is already taken' });
    }

    // 3. Cream userul in Supabase Auth (necesita service role key)
    const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
    });

    if (signUpError) {
        console.error('createUser error:', JSON.stringify(signUpError));
        if (signUpError.message.includes('already been registered')) {
            return res.status(409).json({ error: 'Email is already registered' });
        }
        return res.status(500).json({ error: signUpError.message });
    }

    const userId = authData.user.id;

    // 4. Cream profilul cu acelasi UUID din Auth
    const { error: profileError } = await supabase
        .from('profiles')
        .insert({ id: userId, username });

    if (profileError) {
        console.error('insert profile error:', JSON.stringify(profileError));
        await supabase.auth.admin.deleteUser(userId);
        return res.status(500).json({ error: 'Failed to create user profile', details: profileError.message });
    }

    // 5. Logam userul automat ca sa returnam tokenii (client separat, nu poluam admin-ul)
    const authClient = createAuthClient();
    const { data: sessionData, error: signInError } = await authClient.auth.signInWithPassword({
        email,
        password,
    });

    if (signInError) {
        console.error('signIn after register error:', JSON.stringify(signInError));
        return res.status(500).json({ error: 'User created but auto-login failed' });
    }

    return res.status(201).json({
        user: {
            id: userId,
            username,
            email,
        },
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
    });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // 1. Verificam ca ambele campuri exista
    if (!email || !password) {
        return res.status(400).json({ error: 'email and password are required' });
    }

    // 2. Autentificam userul prin Supabase Auth (client separat)
    const authClient = createAuthClient();
    const { data: sessionData, error: signInError } = await authClient.auth.signInWithPassword({
        email,
        password,
    });

    if (signInError) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 3. Luam profilul ca sa returnam username-ul
    const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', sessionData.user.id)
        .maybeSingle();

    return res.status(200).json({
        user: {
            id: sessionData.user.id,
            email: sessionData.user.email,
            username: profile?.username ?? null,
        },
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
    });
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
    const { refresh_token } = req.body;

    // 1. Verificam ca refresh_token exista
    if (!refresh_token) {
        return res.status(400).json({ error: 'refresh_token is required' });
    }

    // 2. Obtinem un access_token nou cu refresh_token-ul
    const authClient = createAuthClient();
    const { data, error } = await authClient.auth.refreshSession({ refresh_token });

    if (error || !data.session) {
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    return res.status(200).json({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
    });
});

module.exports = router;

