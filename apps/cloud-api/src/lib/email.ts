// ─── Email Delivery ───────────────────────────────────────────────────────────
// In development: logs email content + links to stdout.
// In production: delivers via SendGrid when SENDGRID_API_KEY is set.
// Swap to Resend / SES by replacing the deliverViaSendGrid function.

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(opts: EmailOptions): Promise<void> {
  const isDev =
    process.env.NODE_ENV !== "production" || !process.env.SENDGRID_API_KEY;

  if (isDev) {
    // Log to stdout for development / integration tests
    const links = [...opts.html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    console.log(`\n📧  Email → ${opts.to}`);
    console.log(`    Subject: ${opts.subject}`);
    for (const l of links) console.log(`    Link: ${l}`);
    console.log();
    return;
  }

  await deliverViaSendGrid(opts);
}

async function deliverViaSendGrid(opts: EmailOptions): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY!;
  const from = {
    email: process.env.EMAIL_FROM ?? "noreply@redcoreos.net",
    name: process.env.EMAIL_FROM_NAME ?? "redcore-Tuning",
  };

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: opts.to }] }],
      from,
      subject: opts.subject,
      content: [{ type: "text/html", value: opts.html }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "(no body)");
    throw new Error(`SendGrid delivery failed (${res.status}): ${body}`);
  }
}

// ─── HTML escaping ────────────────────────────────────────────────────────────

function esc(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ─── Email Templates ──────────────────────────────────────────────────────────

const APP = "redcore-Tuning";
const BRAND_COLOR = "#E8453C";
const BG = "#FAFAF9";
const CARD_BG = "#FFFFFF";
const BORDER = "#E8E7E4";
const TEXT = "#282724";
const MUTED = "#6B6A65";
const CAPTION = "#A3A29C";

function emailWrapper(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:32px;background:${BG};font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:${CARD_BG};border-radius:12px;padding:32px;border:1px solid ${BORDER};">
    <p style="margin:0 0 20px;font-size:13px;color:${CAPTION};font-weight:600;letter-spacing:.5px;text-transform:uppercase;">${APP}</p>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${TEXT};">${title}</h1>
    ${body}
  </div>
</body>
</html>`;
}

function primaryButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;margin:20px 0 0;background:${BRAND_COLOR};color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">${label}</a>`;
}

function caption(text: string): string {
  return `<p style="margin:20px 0 0;font-size:13px;color:${CAPTION};">${text}</p>`;
}

export function verifyEmailTemplate(name: string, link: string): string {
  const greeting = name ? `Hi ${esc(name)},` : "Hi,";
  return emailWrapper(
    "Verify your email",
    `<p style="color:${MUTED};margin:0 0 4px;">${greeting}</p>
     <p style="color:${MUTED};margin:0;">Confirm your ${APP} account to get started.</p>
     ${primaryButton(link, "Verify Email")}
     ${caption("Expires in 24 hours. If you didn't sign up, you can safely ignore this.")}`,
  );
}

export function resetPasswordTemplate(name: string, link: string): string {
  const greeting = name ? `Hi ${esc(name)},` : "Hi,";
  return emailWrapper(
    "Reset your password",
    `<p style="color:${MUTED};margin:0 0 4px;">${greeting}</p>
     <p style="color:${MUTED};margin:0;">Click below to choose a new ${APP} password.</p>
     ${primaryButton(link, "Reset Password")}
     ${caption("Expires in 1 hour. If you didn't request this, ignore this email — your password is unchanged.")}`,
  );
}

export function emailChangedTemplate(name: string, oldEmail: string): string {
  const greeting = name ? `Hi ${esc(name)},` : "Hi,";
  return emailWrapper(
    "Your email was changed",
    `<p style="color:${MUTED};margin:0 0 4px;">${greeting}</p>
     <p style="color:${MUTED};margin:0;">Your ${APP} account email was changed from <strong>${esc(oldEmail)}</strong>. If this wasn't you, contact support immediately.</p>`,
  );
}

export function welcomeTemplate(name: string): string {
  const greeting = name ? `Hi ${esc(name)},` : "Hi,";
  return emailWrapper(
    `Welcome to ${APP}`,
    `<p style="color:${MUTED};margin:0 0 4px;">${greeting}</p>
     <p style="color:${MUTED};margin:0;">Your account is ready. Download the app and start tuning.</p>`,
  );
}
