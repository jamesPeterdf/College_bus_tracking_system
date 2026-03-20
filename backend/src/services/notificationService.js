const twilio = require('twilio');
const db = require('../config/db');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const sendSMS = async (to, message) => {
    try {
        await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: to
        });
        return true;
    } catch (err) {
        console.error('Twilio SMS Error:', err);
        return false;
    }
};

const sendWhatsApp = async (to, message) => {
    try {
        await client.messages.create({
            body: message,
            from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
            to: `whatsapp:${to}`
        });
        return true;
    } catch (err) {
        console.error('Twilio WhatsApp Error:', err);
        return false;
    }
};

const notifyBoarding = async (studentId, stopName, time) => {
    const res = await db.query('SELECT name, parent_phone FROM Students WHERE student_id = $1', [studentId]);
    const student = res.rows[0];
    if (student) {
        const message = `Your child ${student.name} has boarded the college bus at ${stopName} at ${time}. Expected college arrival: ~8:45 AM.`;
        await sendSMS(student.parent_phone, message);
        await sendWhatsApp(student.parent_phone, message);
    }
};

module.exports = { sendSMS, sendWhatsApp, notifyBoarding };
