require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.PROJECT_URL, process.env.SERVICE_ROLE);

async function fixSchema() {
    console.log('--- Attempting Schema Fix ---');
    
    // We can use Supabase RPC if available, but usually we just run a query.
    // However, the Supabase JS SDK doesn't have a direct raw SQL executor.
    // I will try to select tx_hash and if it fails, I'll know for sure.
    
    const { error } = await supabase.from('driverhistory').select('tx_hash').limit(1);
    
    if (error && error.message.includes('column "tx_hash" does not exist')) {
        console.error('CRITICAL: tx_hash column is missing!');
        console.log('Please run this in your Supabase SQL Editor:');
        console.log('ALTER TABLE driverhistory ADD COLUMN tx_hash VARCHAR(255);');
    } else if (error) {
        console.error('Database error:', error.message);
    } else {
        console.log('✅ tx_hash column exists.');
    }
}

fixSchema();
