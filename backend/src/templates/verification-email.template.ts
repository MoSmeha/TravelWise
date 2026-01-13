/**
 * Email Verification Template
 * HTML template for the email verification success page
 */

/**
 * Generate the email verification success HTML page
 */
export function getVerificationSuccessHtml(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Email Verified - TravelWise</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 16px;
      text-align: center;
      max-width: 400px;
      margin: 20px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
    }
    .icon {
      font-size: 64px;
      margin-bottom: 20px;
    }
    h1 {
      color: #1f2937;
      margin: 0 0 10px 0;
      font-size: 24px;
    }
    .message {
      color: #6b7280;
      margin: 0 0 20px 0;
      line-height: 1.5;
    }
    .hint {
      color: #9ca3af;
      font-size: 14px;
    }
    .brand {
      margin-top: 24px;
      color: #4f46e5;
      font-weight: 600;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✅</div>
    <h1>Email Verified!</h1>
    <p class="message">
      Your email has been verified successfully. You can now log in to TravelWise and start planning your adventures.
    </p>
    <p class="hint">You can close this window.</p>
    <p class="brand">TravelWise</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate the email verification error HTML page
 */
export function getVerificationErrorHtml(message: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Verification Failed - TravelWise</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #dc2626 0%, #f97316 100%);
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 16px;
      text-align: center;
      max-width: 400px;
      margin: 20px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
    }
    .icon {
      font-size: 64px;
      margin-bottom: 20px;
    }
    h1 {
      color: #1f2937;
      margin: 0 0 10px 0;
      font-size: 24px;
    }
    .message {
      color: #6b7280;
      margin: 0 0 20px 0;
      line-height: 1.5;
    }
    .error {
      color: #dc2626;
      font-size: 14px;
      background: #fef2f2;
      padding: 12px;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">❌</div>
    <h1>Verification Failed</h1>
    <p class="message">
      We couldn't verify your email address.
    </p>
    <p class="error">${escapeHtml(message)}</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char);
}
