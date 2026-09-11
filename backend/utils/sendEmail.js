const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const host = process.env.EMAIL_HOST || 'smtp.hostinger.com';
const port = Number(process.env.EMAIL_PORT || 465);
/** Port 465 = implicit TLS. Port 587 = STARTTLS (set EMAIL_SECURE=false). */
const secure =
  process.env.EMAIL_SECURE === 'true' ||
  (process.env.EMAIL_SECURE !== 'false' && port === 465);

console.log('Email service initialized:', {
  EMAIL_HOST: host,
  EMAIL_PORT: port,
  secure,
  EMAIL_USER: process.env.EMAIL_USER ? 'set' : 'not set',
  EMAIL_PASS: process.env.EMAIL_PASS ? 'set' : 'not set',
});

const sendEmail = async (options) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('EMAIL_USER and EMAIL_PASS must be set in environment');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
      minVersion: 'TLSv1.2',
    },
  });

  const mailOptions = {
    from: `"VisiARise" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.message,
    ...(options.replyTo ? { replyTo: options.replyTo } : {}),
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
