// services/emailService.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

exports.sendConfirmation = async (client) => {
  await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to: client.email,
    subject: 'We received your request!',
    html: `<h2>Hi ${client.first_name}</h2>
           <p>We will contact you soon.</p>`
  });
};