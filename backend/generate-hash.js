const bcrypt = require('bcrypt');
async function run() {
    const hash = await bcrypt.hash('admin123', 10);
    console.log("New hash for admin123:");
    console.log(hash);
}
run();
