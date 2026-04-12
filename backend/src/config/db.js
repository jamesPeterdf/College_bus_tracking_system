const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.PROJECT_URL;
const supabaseKey = process.env.SERVICE_ROLE;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials missing.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
