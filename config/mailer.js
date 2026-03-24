const brevo = require('@getbrevo/brevo');

const BREVO_API_KEY = String(process.env.BREVO_API_KEY || '').trim();
const MAIL_FROM_EMAIL = String(process.env.MAIL_FROM_EMAIL || process.env.SENDER_EMAIL || '').trim();
const MAIL_FROM_NAME = String(process.env.MAIL_FROM_NAME || process.env.SENDER_NAME || 'Garud Classes').trim();

let transactionalApi = null;

function getTransactionalApi() {
  if (transactionalApi) return transactionalApi;
  if (!BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY is not configured');
  }

  const api = new brevo.TransactionalEmailsApi();
  api.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);
  transactionalApi = api;
  return transactionalApi;
}

function getSender() {
  if (!MAIL_FROM_EMAIL) {
    throw new Error('MAIL_FROM_EMAIL is not configured');
  }

  return {
    email: MAIL_FROM_EMAIL,
    name: MAIL_FROM_NAME || 'Garud Classes',
  };
}

async function sendTransactionalMail({ toEmail, toName, subject, htmlContent, textContent }) {
  if (!toEmail) {
    throw new Error('Recipient email is required');
  }

  const api = getTransactionalApi();
  const payload = new brevo.SendSmtpEmail();

  payload.to = [{ email: String(toEmail).trim(), name: String(toName || '').trim() || undefined }];
  payload.sender = getSender();
  payload.subject = String(subject || '').trim() || 'Garud Classes Notification';
  payload.htmlContent = String(htmlContent || '').trim() || '<p>Notification from Garud Classes.</p>';
  if (textContent) {
    payload.textContent = String(textContent).trim();
  }

  return api.sendTransacEmail(payload);
}

async function sendPasswordResetOtpEmail({ toEmail, otp, expiresInMinutes = 10 }) {
  const safeOtp = String(otp || '').trim();
  const safeExpiry = Number(expiresInMinutes) > 0 ? Number(expiresInMinutes) : 10;

  const subject = 'Your Garud Classes password reset OTP';
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;max-width:560px;margin:0 auto;padding:16px;">
      <h2 style="margin:0 0 12px;">Password Reset OTP</h2>
      <p style="margin:0 0 12px;">Use the OTP below to reset your password.</p>
      <div style="font-size:28px;font-weight:700;letter-spacing:4px;padding:12px 16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;display:inline-block;">${safeOtp}</div>
      <p style="margin:12px 0 0;">This OTP expires in <strong>${safeExpiry} minutes</strong>.</p>
      <p style="margin:12px 0 0;color:#475569;">If you did not request this, you can ignore this email.</p>
    </div>
  `;

  const textContent = `Password Reset OTP: ${safeOtp}\nThis OTP expires in ${safeExpiry} minutes.\nIf you did not request this, ignore this email.`;

  return sendTransactionalMail({
    toEmail,
    subject,
    htmlContent,
    textContent,
  });
}

module.exports = {
  sendTransactionalMail,
  sendPasswordResetOtpEmail,
};
