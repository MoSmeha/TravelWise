/**
 * Email Service
 * Handles sending verification emails and other email communications
 */

import nodemailer from 'nodemailer';

// Gmail SMTP configuration
const SMTP_GMAIL = process.env.SMTP_GMAIL;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM || `TravelWise <${SMTP_GMAIL}>`;

// Logo URL
const LOGO_URL = 'https://res.cloudinary.com/dgsxk7nf5/image/upload/v1769224390/TravelWise-Logo_ogc2ai.png';
const PRIMARY_COLOR = '#004e89';

// Create transporter - configured for Gmail SMTP
let transporter: nodemailer.Transporter | null = null;

if (SMTP_GMAIL && SMTP_PASSWORD) {
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // use SSL
    auth: {
      user: SMTP_GMAIL,
      pass: SMTP_PASSWORD,
    },
  });
  console.log('[INFO] Email service configured with Gmail SMTP');
} else {
  console.log('[INFO] Email service running in console mode (SMTP credentials not configured)');
}

/**
 * Send verification email with OTP
 */
export async function sendVerificationEmail(
  email: string,
  name: string,
  otp: string
): Promise<boolean> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email - TravelWise</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #ffffff; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; border-bottom: 3px solid ${PRIMARY_COLOR};">
        <img src="${LOGO_URL}" alt="TravelWise" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover;">
      </div>
      <div style="background: #f9fafb; padding: 40px 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #1f2937; margin-top: 0; font-size: 24px;">Welcome, ${name}</h2>
        <p style="color: #4b5563; font-size: 16px;">Thanks for signing up for TravelWise! Use the code below to verify your email address:</p>
        <div style="text-align: center; margin: 35px 0;">
          <div style="background-color: ${PRIMARY_COLOR}; color: white; padding: 15px 35px; border-radius: 8px; display: inline-block;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; font-family: monospace;">${otp}</span>
          </div>
        </div>
        <p style="color: #6b7280; font-size: 14px; text-align: center;">Enter this code in the app to verify your email.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-bottom: 0;">This code will expire in 10 minutes. If you did not create an account, you can safely ignore this email.</p>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Welcome to TravelWise, ${name}

Your verification code is: ${otp}

Enter this code in the app to verify your email.

This code will expire in 10 minutes.

If you did not create an account, you can safely ignore this email.
  `;

  // If SMTP is not configured, log to console instead
  if (!transporter) {
    console.log('');
    console.log('[EMAIL] ═══════════════════════════════════════════════════════════');
    console.log('[EMAIL] VERIFICATION EMAIL (console mode - SMTP not configured)');
    console.log('[EMAIL] ═══════════════════════════════════════════════════════════');
    console.log(`[EMAIL] To: ${email}`);
    console.log(`[EMAIL] Name: ${name}`);
    console.log(`[EMAIL] Verification OTP: ${otp}`);
    console.log('[EMAIL] ═══════════════════════════════════════════════════════════');
    console.log('');
    return true;
  }

  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: email,
      subject: 'Verify Your Email - TravelWise',
      text: textContent,
      html: htmlContent,
    });
    
    console.log(`📧 Verification email sent to ${email}`);
    return true;
  } catch (error: any) {
    console.error('Failed to send verification email:', error.message);
    return false;
  }
}

/**
 * Send welcome email after verification
 */
export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #ffffff; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; border-bottom: 3px solid ${PRIMARY_COLOR};">
        <img src="${LOGO_URL}" alt="TravelWise" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover;">
      </div>
      <div style="background: #f9fafb; padding: 40px 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #1f2937; margin-top: 0; font-size: 24px;">Verification Successful</h2>
        <p style="color: #4b5563; font-size: 16px;">Hello ${name}, your email has been verified. You now have full access to TravelWise.</p>
        <p style="color: #4b5563; font-size: 16px;">Start exploring hidden gems, generate personalized itineraries, and travel smarter.</p>
        <div style="margin-top: 30px;">
          <p style="color: #1f2937; font-weight: 600;">The TravelWise Team</p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log(`[EMAIL] Welcome email would be sent to ${email} (SMTP not configured)`);
    return true;
  }

  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: email,
      subject: 'Welcome to TravelWise',
      html: htmlContent,
    });
    return true;
  } catch (error: any) {
    console.error('Failed to send welcome email:', error.message);
    return false;
  }
}
