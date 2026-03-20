const axios = require('axios');

async function testLogin() {
    try {
        console.log("Testing Student Login...");
        const res = await axios.post('http://localhost:5000/api/auth/student/login', {
            roll_number: '2021CS01',
            password: 'password123'
        });
        console.log("Success:", Object.keys(res.data));
    } catch (err) {
        console.error("Error:", err.response ? err.response.data : err.message);
    }
}

testLogin();
