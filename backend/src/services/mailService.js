const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL,
        pass: process.env.PASS
    }
});

const sendAttendanceEmail = async (parentEmail, studentName, status, date) => {
    const mailOptions = {
        from: `"Jaya College Transport" <${process.env.GMAIL}>`,
        to: parentEmail,
        subject: `Attendance Alert: ${studentName}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
                <h2 style="color: #2c3e50; text-align: center;">Attendance Notification</h2>
                <p>Dear Parent,</p>
                <p>This is to inform you about the attendance of your child for the college bus service.</p>
                
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Student Name:</strong> ${studentName}</p>
                    <p><strong>Date:</strong> ${date}</p>
                    <p><strong>Status:</strong> <span style="color: ${status === 'Present' ? '#27ae60' : '#e74c3c'}; font-weight: bold;">${status}</span></p>
                </div>

                <p>Thank you for using Jaya College Transport services.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #7f8c8d; text-align: center;">This is an automated message. Please do not reply.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);

        return { success: true };
    } catch (error) {
        console.error('Email sending failed:', error);
        return { success: false, error: error.message };
    }
};

module.exports = { sendAttendanceEmail };
