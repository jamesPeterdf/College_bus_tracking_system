const db = require('./src/config/db');
async function check() {
    try {
        const res = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'students'");
        require('fs').writeFileSync('types_out.json', JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch(err) {
        process.exit(1);
    }
}
check();
