// ---------------------------------------------------------------------------
// Email service — Dev: console.log / Prod: SendGrid
// ---------------------------------------------------------------------------

const isDev = process.env.NODE_ENV !== 'production';
const sendgridApiKey = process.env.SENDGRID_API_KEY;
const fromEmail = process.env.FROM_EMAIL ?? 'noreply@redcore-os.com';
const appUrl = process.env.APP_URL ?? 'http://localhost:5173';

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
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#141414;border:1px solid #262626;border-radius:8px;padding:40px;color:#e5e5e5;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#ffffff;font-size:20px;font-weight:600;margin:0;">redcore-OS</h1>
    </div>
    ${content}
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #262626;text-align:center;font-size:12px;color:#737373;">
      redcore-OS — Premium Windows Transformation
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
    <p style="color:#e5e5e5;font-size:15px;line-height:1.6;">${greeting},</p>
    <p style="color:#d4d4d4;font-size:14px;line-height:1.6;">
      Please verify your email address to activate your redcore-OS account.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${verifyUrl}"
         style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:14px;font-weight:600;">
        Verify Email
      </a>
    </div>
    <p style="color:#737373;font-size:12px;">
      This link expires in 24 hours. If you did not create an account, ignore this email.
    </p>
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
    <p style="color:#e5e5e5;font-size:15px;line-height:1.6;">${greeting},</p>
    <p style="color:#d4d4d4;font-size:14px;line-height:1.6;">
      A password reset was requested for your redcore-OS account.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${resetUrl}"
         style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:14px;font-weight:600;">
        Reset Password
      </a>
    </div>
    <p style="color:#737373;font-size:12px;">
      This link expires in 1 hour. If you did not request this, ignore this email.
    </p>
  `);

  await send(to, 'Reset your redcore-OS password', html);
}

export async function sendWelcomeEmail(
  to: string,
  displayName?: string,
): Promise<void> {
  const greeting = displayName ? `Welcome ${displayName}` : 'Welcome';

  const html = wrap(`
    <p style="color:#e5e5e5;font-size:15px;line-height:1.6;">${greeting},</p>
    <p style="color:#d4d4d4;font-size:14px;line-height:1.6;">
      Your redcore-OS account is ready. You can now assess your Windows installation
      and begin transforming it into a cleaner, faster system.
    </p>
    <p style="color:#d4d4d4;font-size:14px;line-height:1.6;">
      Free tier includes a basic health assessment and 3 safe cleanup actions.
      Upgrade to Pro for the full 150+ transformation actions.
    </p>
  `);

  await send(to, 'Welcome to redcore-OS', html);
}

export async function sendSubscriptionConfirmationEmail(
  to: string,
  tier: string,
  billingPeriod: string,
): Promise<void> {
  const html = wrap(`
    <p style="color:#e5e5e5;font-size:15px;line-height:1.6;">Your subscription has been confirmed.</p>
    <div style="background:#1a1a1a;border:1px solid #262626;border-radius:6px;padding:16px;margin:16px 0;">
      <p style="color:#d4d4d4;font-size:14px;margin:4px 0;"><strong>Plan:</strong> ${tier.charAt(0).toUpperCase() + tier.slice(1)}</p>
      <p style="color:#d4d4d4;font-size:14px;margin:4px 0;"><strong>Billing:</strong> ${billingPeriod}</p>
    </div>
    <p style="color:#d4d4d4;font-size:14px;line-height:1.6;">
      You now have full access to all transformation actions. Launch redcore-OS to get started.
    </p>
  `);

  await send(to, `redcore-OS ${tier} subscription confirmed`, html);
}
