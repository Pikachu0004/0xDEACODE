const sendEmail = require('../utils/sendEmail');

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isValidEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

exports.submitContact = async (req, res) => {
  try {
    const { name, email, message, subject } = req.body || {};
    const n = typeof name === 'string' ? name.trim().slice(0, 120) : '';
    const e = typeof email === 'string' ? email.trim().toLowerCase().slice(0, 254) : '';
    const m = typeof message === 'string' ? message.trim().slice(0, 8000) : '';
    const sub = typeof subject === 'string' ? subject.trim().slice(0, 200) : '';

    if (!n || !e || !m) {
      return res.status(400).json({ message: 'Name, email, and message are required' });
    }
    if (!isValidEmail(e)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }

    const inbox = process.env.CONTACT_TO || process.env.EMAIL_FROM || process.env.EMAIL_USER;
    if (!inbox) {
      return res.status(500).json({ message: 'Contact inbox is not configured' });
    }

    const title = sub || 'VisiARise website contact';

    await sendEmail({
      email: inbox,
      subject: `[Contact] ${title} — ${n}`,
      replyTo: e,
      message: `
        <p><b>From:</b> ${escapeHtml(n)} &lt;${escapeHtml(e)}&gt;</p>
        <p><b>Message:</b></p>
        <pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(m)}</pre>
      `,
    });

    res.status(200).json({ message: 'Thanks — we received your message.' });
  } catch (err) {
    console.error('submitContact:', err.message);
    res.status(500).json({
      message: 'Could not send message. Please try again or email us directly.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};
