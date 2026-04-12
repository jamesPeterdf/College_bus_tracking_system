const fs = require('fs');
const bcrypt = require('bcrypt');
async function run() {
    const hash = await bcrypt.hash('admin123', 10);
    let env = fs.readFileSync('.env', 'utf8');
    env = env.replace(/ADMIN_PASSWORD_HASH=.*/, `ADMIN_PASSWORD_HASH=${hash}`);
    fs.writeFileSync('.env', env);
    console.log("Admin password set to admin123");
}
run();
