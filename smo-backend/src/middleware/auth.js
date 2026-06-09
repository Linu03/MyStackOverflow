const { supabase } = require('../supabase');

async function requireAuth(req, res, next) {
    const authHeader = req.headers['authorization'];

    // 1. Verificam ca header-ul exista
    if (!authHeader) {
        return res.status(401).json({ error: 'Missing Authorization header' });
    }

    // 2. Verificam formatul "Bearer <token>"
    if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Invalid Authorization format. Expected: Bearer <token>' });
    }

    // 3. Extragem token-ul
    const token = authHeader.split(' ')[1];

    // 4. Lasam Supabase sa verifice semnatura si expirarea
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // 5. Atasam userul la request pentru route-urile urmatoare
    req.user = user;
    next();
}

module.exports = { requireAuth };
