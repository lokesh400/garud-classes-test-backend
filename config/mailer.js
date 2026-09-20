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
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; padding: 40px 20px; color: #1f2937;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 1px;">
            <img src="https://testportal.garudclasses.com/images/logo.png" alt="" style="width: 40px; height: 40px; vertical-align: middle; margin-right: 12px; margin-bottom: 4px;" />
            <span style="vertical-align: middle;">GARUD CLASSES</span>
          </h1>
        </div>
        <div style="padding: 40px 30px;">
          <h2 style="margin: 0 0 16px; font-size: 22px; color: #111827;">Password Reset Request</h2>
          <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">We received a request to reset your Garud Classes account password. Use the verification code below to proceed.</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; background: #eff6ff; border: 2px dashed #3b82f6; border-radius: 12px; padding: 16px 32px; font-size: 32px; font-weight: 800; color: #1d4ed8; letter-spacing: 6px;">${safeOtp}</div>
          </div>
          <p style="margin: 0 0 12px; font-size: 14px; color: #6b7280; text-align: center;">This code will expire in <strong>${safeExpiry} minutes</strong>.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="margin: 0; font-size: 13px; color: #9ca3af; text-align: center;">If you did not request a password reset, please safely ignore this email.</p>
        </div>
      </div>
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

async function sendPasswordResetLinkEmail({ toEmail, resetUrl, expiresInMinutes = 10 }) {
  const safeUrl = String(resetUrl || '').trim();
  const safeExpiry = Number(expiresInMinutes) > 0 ? Number(expiresInMinutes) : 10;

  const subject = 'Reset your Garud Classes password';
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; padding: 40px 20px; color: #1f2937;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 1px;">
            <img src="https://testportal.garudclasses.com/images/logo.png" alt="" style="width: 40px; height: 40px; vertical-align: middle; margin-right: 12px; margin-bottom: 4px;" />
            <span style="vertical-align: middle;">GARUD CLASSES</span>
          </h1>
        </div>
        <div style="padding: 40px 30px;">
          <h2 style="margin: 0 0 16px; font-size: 22px; color: #111827;">Reset Your Password</h2>
          <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">You're just one step away from regaining access to your account. Click the button below to set a new password.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${safeUrl}" style="display: inline-block; background: linear-gradient(to right, #2563eb, #3b82f6); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.25);">Reset Password</a>
          </div>
          <p style="margin: 0 0 12px; font-size: 14px; color: #6b7280; text-align: center;">This link will expire in <strong>${safeExpiry} minutes</strong>.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="margin: 0; font-size: 13px; color: #9ca3af; text-align: center;">If you did not request this, you can safely ignore this email.</p>
        </div>
      </div>
    </div>
  `;

  const textContent = `Reset your password: ${safeUrl}\nThis link expires in ${safeExpiry} minutes.\nIf you did not request this, ignore this email.`;

  return sendTransactionalMail({
    toEmail,
    subject,
    htmlContent,
    textContent,
  });
}

async function sendRegistrationOtpEmail({ toEmail, otp, expiresInMinutes = 10 }) {
  const safeOtp = String(otp || '').trim();
  const safeExpiry = Number(expiresInMinutes) > 0 ? Number(expiresInMinutes) : 10;

  const subject = 'Your Garud Classes Registration OTP';
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; padding: 40px 20px; color: #1f2937;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #e94560 0%, #16213e 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 1px;">
            <img src="https://testportal.garudclasses.com/images/logo.png" alt="" style="width: 40px; height: 40px; vertical-align: middle; margin-right: 12px; margin-bottom: 4px;" />
            <span style="vertical-align: middle;">GARUD CLASSES</span>
          </h1>
        </div>
        <div style="padding: 40px 30px;">
          <h2 style="margin: 0 0 16px; font-size: 24px; color: #111827; text-align: center;">Welcome to the Family! 🎉</h2>
          <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6; text-align: center;">We are thrilled to have you. Please verify your email address to complete your registration.</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; background: #fff1f2; border: 2px dashed #e11d48; border-radius: 12px; padding: 16px 32px; font-size: 32px; font-weight: 800; color: #be123c; letter-spacing: 6px;">${safeOtp}</div>
          </div>
          <p style="margin: 0 0 12px; font-size: 14px; color: #6b7280; text-align: center;">This verification code expires in <strong>${safeExpiry} minutes</strong>.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="margin: 0; font-size: 13px; color: #9ca3af; text-align: center;">If you didn't attempt to sign up, please disregard this email.</p>
        </div>
      </div>
    </div>
  `;

  const textContent = `Registration OTP: ${safeOtp}\nThis OTP expires in ${safeExpiry} minutes.\nIf you did not request this, ignore this email.`;

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
  sendPasswordResetLinkEmail,
  sendRegistrationOtpEmail,
};
