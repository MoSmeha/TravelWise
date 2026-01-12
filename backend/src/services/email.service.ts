/**
 * Email Service
 * Handles sending verification emails and other email communications
 */

import nodemailer from 'nodemailer';
import { getVerificationLink } from './auth.service';

// Environment variables
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || 'TravelWise <noreply@travelwise.app>';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create transporter - only if SMTP is configured
let transporter: nodemailer.Transporter | null = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

/**
 * Send verification email
 */
export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string
): Promise<boolean> {
  const verificationLink = getVerificationLink(token);
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email - TravelWise</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🌍 TravelWise</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #1f2937; margin-top: 0;">Welcome, ${name}! 👋</h2>
        <p style="color: #4b5563;">Thanks for signing up for TravelWise! Please verify your email address to get started discovering hidden gems and planning your perfect trips.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Verify Email Address</a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link in your browser:</p>
        <p style="color: #4f46e5; font-size: 12px; word-break: break-all; background: #eef2ff; padding: 12px; border-radius: 6px;">${verificationLink}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-bottom: 0;">This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Welcome to TravelWise, ${name}!

Please verify your email address by clicking the link below:

${verificationLink}

This link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.
  `;

  // In development without SMTP, just log the link
  if (!transporter || NODE_ENV === 'development') {
    console.log('');
    console.log('📧 ═══════════════════════════════════════════════════════════');
    console.log('📧 VERIFICATION EMAIL (console mode - SMTP not configured)');
    console.log('📧 ═══════════════════════════════════════════════════════════');
    console.log(`📧 To: ${email}`);
    console.log(`📧 Name: ${name}`);
    console.log(`📧 Verification Link: ${verificationLink}`);
    console.log('📧 ═══════════════════════════════════════════════════════════');
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
      <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🌍 TravelWise</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #1f2937; margin-top: 0;">You're Verified! 🎉</h2>
        <p style="color: #4b5563;">Hey ${name}, your email is now verified. You have full access to TravelWise!</p>
        <p style="color: #4b5563;">Start exploring hidden gems, generate personalized itineraries, and avoid tourist traps with local insights.</p>
        <p style="color: #1f2937; font-weight: 600;">Happy travels! ✈️</p>
      </div>
    </body>
    </html>
  `;

  if (!transporter || NODE_ENV === 'development') {
    console.log(`📧 Welcome email would be sent to ${email} (dev mode)`);
    return true;
  }

  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: email,
      subject: 'Welcome to TravelWise! 🌍',
      html: htmlContent,
    });
    return true;
  } catch (error: any) {
    console.error('Failed to send welcome email:', error.message);
    return false;
  }
}
