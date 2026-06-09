require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Client admin — doar pentru DB + auth.admin + getUser(token).
// Nu folosi signInWithPassword pe acest client (strica bypass-ul RLS).
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

// Client separat doar pentru login/register (returneaza token-uri).
function createAuthClient() {
    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        },
    );
}

module.exports = { supabase, createAuthClient };
