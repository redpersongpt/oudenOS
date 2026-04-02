// ---------------------------------------------------------------------------
// Email service — Dev: console.log / Prod: SendGrid
// ---------------------------------------------------------------------------

const isDev = process.env.NODE_ENV !== 'production';
const sendgridApiKey = process.env.SENDGRID_API_KEY;
const fromEmail = process.env.FROM_EMAIL ?? 'noreply@ouden.cc';
const appUrl = process.env.APP_URL ?? 'http://localhost:5173';
const brandColor = '#E8E8E8';
const bg = '#000000';
const cardBg = '#111111';
const border = '#222222';
const text = '#F0F0F4';
const muted = '#A0A0AC';
const caption = '#6A6A76';
const supportEmail = 'support@ouden.cc';

// ---------------------------------------------------------------------------
// SendGrid transport
// ---------------------------------------------------------------------------

async function sendViaGrid(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  if (!sendgridApiKey) {
    throw new Error('SENDGRID_API_KEY is required in production');
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sendgridApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail, name: 'redcore-OS' },
      subject,
      content: [{ type: 'text/html', value: html }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`SendGrid error ${response.status}: ${body}`);
  }
}

// ---------------------------------------------------------------------------
// Dev transport
// ---------------------------------------------------------------------------

function sendViaDev(to: string, subject: string, html: string): void {
  console.log('--- EMAIL ---');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${html.replace(/<[^>]*>/g, ' ').slice(0, 300)}...`);
  console.log('--- /EMAIL ---');
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

async function send(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  if (isDev) {
    sendViaDev(to, subject, html);
    return;
  }
  await sendViaGrid(to, subject, html);
}

// ---------------------------------------------------------------------------
// Template wrapper
// ---------------------------------------------------------------------------

function wrap(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:32px;background:
  radial-gradient(circle at top left, rgba(255,255,255,0.04), transparent 34%),
  radial-gradient(circle at top right, rgba(255,255,255,0.02), transparent 28%),
  ${bg};font-family:'Plus Jakarta Sans',Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:620px;margin:0 auto;">
    <div style="padding:0 6px 16px;font-size:14px;font-weight:800;letter-spacing:.12em;text-transform:lowercase;color:${text};">redcore</div>
    <div style="background:linear-gradient(180deg,rgba(255,255,255,0.06),rgba(44,44,49,0.96) 30%);border-radius:28px;padding:1px;">
      <div style="background:${cardBg};border-radius:27px;padding:34px;border:1px solid ${border};box-shadow:0 28px 80px rgba(0,0,0,0.34);color:${text};">
        ${content}
      </div>
    </div>
    <div style="padding:18px 8px 0;color:${caption};font-size:12px;line-height:1.6;text-align:center;">
      <div>Need help? <a href="mailto:${supportEmail}" style="color:#E8E8E8;text-decoration:none;">${supportEmail}</a></div>
    </div>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function sendVerificationEmail(
  to: string,
  token: string,
  displayName?: string,
): Promise<void> {
  const greeting = displayName ? `Hello ${displayName}` : 'Hello';
  const verifyUrl = `${appUrl}/verify-email?token=${encodeURIComponent(token)}`;

  const html = wrap(`
    <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;font-weight:800;letter-spacing:-0.03em;color:${text};">Verify your email</h1>
    <p style="color:${muted};margin:0 0 6px;font-size:15px;line-height:1.75;">${greeting},</p>
    <p style="color:${muted};margin:0;font-size:15px;line-height:1.75;">Use the button below to verify your account.</p>
    <div style="text-align:left;margin:24px 0 0;">
      <a href="${verifyUrl}"
         style="display:inline-flex;align-items:center;justify-content:center;background:${brandColor};color:#000000;text-decoration:none;padding:12px 20px;border-radius:12px;font-size:14px;font-weight:800;letter-spacing:.01em;">
        Verify email
      </a>
    </div>
    <p style="color:${caption};font-size:13px;line-height:1.6;margin:18px 0 0;">This link expires in 24 hours.</p>
  `);

  await send(to, 'Verify your redcore-OS email', html);
}

export async function sendPasswordResetEmail(
  to: string,
  token: string,
  displayName?: string,
): Promise<void> {
  const greeting = displayName ? `Hello ${displayName}` : 'Hello';
  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

  const html = wrap(`
    <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;font-weight:800;letter-spacing:-0.03em;color:${text};">Password reset</h1>
    <p style="color:${muted};margin:0 0 6px;font-size:15px;line-height:1.75;">${greeting},</p>
    <p style="color:${muted};margin:0;font-size:15px;line-height:1.75;">Use the button below to set a new password.</p>
    <div style="text-align:left;margin:24px 0 0;">
      <a href="${resetUrl}"
         style="display:inline-flex;align-items:center;justify-content:center;background:${brandColor};color:#000000;text-decoration:none;padding:12px 20px;border-radius:12px;font-size:14px;font-weight:800;letter-spacing:.01em;">
        Reset password
      </a>
    </div>
    <p style="color:${caption};font-size:13px;line-height:1.6;margin:18px 0 0;">This link expires in 1 hour.</p>
  `);

  await send(to, 'Reset your redcore-OS password', html);
}

export async function sendWelcomeEmail(
  to: string,
  displayName?: string,
): Promise<void> {
  const greeting = displayName ? `Welcome ${displayName}` : 'Welcome';

  const html = wrap(`
    <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;font-weight:800;letter-spacing:-0.03em;color:${text};">Welcome to redcore OS</h1>
    <p style="color:${muted};margin:0 0 6px;font-size:15px;line-height:1.75;">${greeting},</p>
    <p style="color:${muted};margin:0;font-size:15px;line-height:1.75;">Your account is ready. Open the app and start tuning.</p>
    <p style="color:${muted};font-size:14px;line-height:1.7;margin:18px 0 0;">Free tier includes a basic health assessment and a few safe actions.</p>
  `);

  await send(to, 'Welcome to redcore-OS', html);
}

export async function sendSubscriptionConfirmationEmail(
  to: string,
  tier: string,
  billingPeriod: string,
): Promise<void> {
  const html = wrap(`
    <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;font-weight:800;letter-spacing:-0.03em;color:${text};">License active</h1>
    <p style="color:${muted};margin:0 0 6px;font-size:15px;line-height:1.75;">Your purchase is active.</p>
    <div style="background:rgba(255,255,255,0.02);border:1px solid ${border};border-radius:16px;padding:16px;margin:16px 0 0;">
      <p style="color:${muted};font-size:14px;margin:4px 0;"><strong style="color:${text};">Plan:</strong> ${tier.charAt(0).toUpperCase() + tier.slice(1)}</p>
      <p style="color:${muted};font-size:14px;margin:4px 0;"><strong style="color:${text};">Billing:</strong> ${billingPeriod}</p>
    </div>
    <p style="color:${muted};font-size:14px;line-height:1.7;margin:18px 0 0;">Open the app to access the unlocked features.</p>
  `);

  await send(to, `redcore-OS ${tier} subscription confirmed`, html);
}
