const fs = require('fs');
const bcrypt = require('bcrypt');
const hash = '$2b$10$BkBHSXPiIUvlFw6z16t2Jx9FdQJz8e.drdI7qLOld6';

async function testPassword(password) {
    const isMatch = await bcrypt.compare(password, hash);
    if (isMatch) {
        fs.writeFileSync('password-found.txt', `Success: ${password}`);
    }
}

async function run() {
    const common = ['admin', 'password', 'admin123', 'admin@123', '123456', 'cobus', 'cobus@123', 'admin@cobus'];
    for (let p of common) {
        await testPassword(p);
    }
    console.log("Done testing passwords.");
}

run();
