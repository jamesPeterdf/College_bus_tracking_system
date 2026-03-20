const bcrypt = require('bcrypt');
const hash = '$2b$10$BkBHSXPiIUvlFw6z16t2Jx9FdQJz8e.drdI7qLOld6';

async function testPassword(password) {
    const isMatch = await bcrypt.compare(password, hash);
    console.log(`Password "${password}" match: ${isMatch}`);
}

async function run() {
    await testPassword('admin');
    await testPassword('password');
    await testPassword('admin123');
    await testPassword('123456');
}

run();
