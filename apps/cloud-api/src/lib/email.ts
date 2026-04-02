// Email Delivery
// In production: prefers SendGrid when configured, otherwise falls back to
// local sendmail so the server can still deliver branded transactional mail.

import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(opts: EmailOptions): Promise<void> {
  const from = {
    email: process.env.EMAIL_FROM ?? "noreply@redcoreos.net",
    name: process.env.EMAIL_FROM_NAME ?? "redcore",
  };
  const sendmailPath = process.env.SENDMAIL_BIN ?? "/usr/sbin/sendmail";
  const canUseSendGrid = Boolean(process.env.SENDGRID_API_KEY);
  const canUseSendmail =
    process.env.SENDMAIL_ENABLED !== "false" && existsSync(sendmailPath);

  if (canUseSendGrid) {
    await deliverViaSendGrid(opts, from);
    return;
  }

  if (canUseSendmail) {
    await deliverViaSendmail(opts, from, sendmailPath);
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    const links = [...opts.html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    console.log(`\n📧  Email → ${opts.to}`);
    console.log(`    Subject: ${opts.subject}`);
    for (const link of links) console.log(`    Link: ${link}`);
    console.log();
    return;
  }

  throw new Error("Email delivery is not configured. Set SENDGRID_API_KEY or enable sendmail.");
}

async function deliverViaSendGrid(
  opts: EmailOptions,
  from: { email: string; name: string },
): Promise<void> {
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
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

  console.info("[email] delivered via SendGrid", { to: opts.to, subject: opts.subject });
}

async function deliverViaSendmail(
  opts: EmailOptions,
  from: { email: string; name: string },
  sendmailPath: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(sendmailPath, ["-t", "-oi"], { stdio: ["pipe", "pipe", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`sendmail exited with code ${code}${stderr ? `: ${stderr.trim()}` : ""}`));
    });

    child.stdin.end(
      [
        `To: ${opts.to}`,
        `From: "${from.name}" <${from.email}>`,
        `Subject: ${opts.subject}`,
        "MIME-Version: 1.0",
        'Content-Type: text/html; charset="UTF-8"',
        "",
        opts.html,
      ].join("\n"),
    );
  });

  console.info("[email] delivered via sendmail", { to: opts.to, subject: opts.subject });
}

// HTML escaping

function esc(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Email Templates

const APP = "Ouden.Tuning";
const SUPPORT_EMAIL = "support@ouden.cc";
const BRAND_COLOR = "#D71921";
const BG = "#000000";
const CARD_BG = "#111111";
const BORDER = "#222222";
const TEXT = "#F0F0F4";
const MUTED = "#A0A0AC";
const CAPTION = "#6A6A76";

function emailWrapper(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:32px;background:
  ${BG};font-family:'Space Grotesk',Inter,system-ui,-apple-system,sans-serif;">
  <div style="max-width:620px;margin:0 auto;">
    <div style="padding:0 6px 16px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${TEXT};font-family:'Space Mono',monospace;">OUDEN</div>
    <div style="border-radius:12px;padding:1px;border:1px solid ${BORDER};">
      <div style="background:${CARD_BG};border-radius:27px;padding:34px;border:1px solid ${BORDER};box-shadow:0 28px 80px rgba(0,0,0,0.34);">
        <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;font-weight:800;letter-spacing:-0.03em;color:${TEXT};">${title}</h1>
        ${body}
      </div>
    </div>
    <div style="padding:18px 8px 0;color:${CAPTION};font-size:12px;line-height:1.6;text-align:center;">
      <div>Need help? <a href="mailto:${SUPPORT_EMAIL}" style="color:#ff98a0;text-decoration:none;">${SUPPORT_EMAIL}</a></div>
    </div>
  </div>
</body>
</html>`;
}

function primaryButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-flex;align-items:center;justify-content:center;margin:24px 0 0;background:linear-gradient(180deg,#ff6b70 0%,${BRAND_COLOR} 100%);color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:800;font-size:14px;letter-spacing:.01em;box-shadow:0 10px 24px rgba(232,37,75,0.22);">${label}</a>`;
}

function caption(text: string): string {
  return `<p style="margin:18px 0 0;font-size:13px;color:${CAPTION};line-height:1.6;">${text}</p>`;
}

export function verifyEmailTemplate(name: string, link: string): string {
  return emailWrapper(
    "Verify email",
    `<p style="color:${MUTED};margin:0;font-size:15px;line-height:1.75;">${name ? `Hi ${esc(name)},` : "Hi,"}</p>
     <p style="color:${MUTED};margin:10px 0 0;font-size:15px;line-height:1.75;">Use the button below to verify your email address.</p>
     ${primaryButton(link, "Verify email")}
     ${caption("This link expires in 24 hours. If you did not request it, you can ignore this email.")}`,
  );
}

export function resetPasswordTemplate(name: string, link: string): string {
  return emailWrapper(
    "Password reset",
    `<p style="color:${MUTED};margin:0;font-size:15px;line-height:1.75;">${name ? `Hi ${esc(name)},` : "Hi,"}</p>
     <p style="color:${MUTED};margin:10px 0 0;font-size:15px;line-height:1.75;">Use the button below to set a new password for your redcore account.</p>
     ${primaryButton(link, "Reset password")}
     ${caption("This link expires in 1 hour.")}`,
  );
}

export function emailChangedTemplate(name: string, oldEmail: string): string {
  return emailWrapper(
    "Your email was changed",
    `<p style="color:${MUTED};margin:0;font-size:15px;line-height:1.7;">Your account email changed from <strong>${esc(oldEmail)}</strong>. If this wasn't you, contact support immediately.</p>`,
  );
}

export function welcomeTemplate(name: string): string {
  return emailWrapper(
    `Welcome to ${APP}`,
    `<p style="color:${MUTED};margin:0;font-size:15px;line-height:1.75;">Your account is ready. Open the app and start tuning.</p>`,
  );
}
