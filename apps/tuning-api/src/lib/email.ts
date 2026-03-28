// ─── Email Delivery ──────────────────────────────────────────────────────────
// Stub for dev — replace with SendGrid / Resend / SES in production.
// Set EMAIL_PROVIDER=sendgrid and SENDGRID_API_KEY to enable real delivery.

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  if (process.env.NODE_ENV !== "production" || !process.env.SENDGRID_API_KEY) {
    console.log(`\n📧  To: ${opts.to}`);
    console.log(`    Subject: ${opts.subject}`);
    const links = opts.html.match(/href="([^"]+)"/g) ?? [];
    for (const l of links) console.log(`    Link: ${l.replace(/href="|"/g, "")}`);
    console.log();
    return;
  }

  // Production: SendGrid
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: opts.to }] }],
      from: { email: "noreply@redcoreos.net", name: "redcore-Tuning" },
      subject: opts.subject,
      content: [{ type: "text/html", value: opts.html }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SendGrid error ${res.status}: ${body}`);
  }
}

const APP_NAME = "redcore-Tuning";

export function verifyEmailHtml(name: string, link: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; background: #FAFAF9; padding: 32px;">
  <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; border: 1px solid #E8E7E4;">
    <h1 style="font-size: 20px; color: #282724; margin: 0 0 8px;">Verify your email</h1>
    <p style="color: #6B6A65; margin: 0 0 24px;">Hi ${name}, confirm your ${APP_NAME} account:</p>
    <a href="${link}" style="display: inline-block; background: #E8453C; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      Verify Email
    </a>
    <p style="color: #A3A29C; font-size: 13px; margin: 24px 0 0;">Expires in 24 hours. If you didn't create an account, ignore this email.</p>
  </div>
</body>
</html>`;
}

export function resetPasswordHtml(name: string, link: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; background: #FAFAF9; padding: 32px;">
  <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; border: 1px solid #E8E7E4;">
    <h1 style="font-size: 20px; color: #282724; margin: 0 0 8px;">Reset your password</h1>
    <p style="color: #6B6A65; margin: 0 0 24px;">Hi ${name}, click below to reset your ${APP_NAME} password:</p>
    <a href="${link}" style="display: inline-block; background: #E8453C; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      Reset Password
    </a>
    <p style="color: #A3A29C; font-size: 13px; margin: 24px 0 0;">Expires in 1 hour. If you didn't request this, ignore this email.</p>
  </div>
</body>
</html>`;
}
