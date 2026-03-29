// ─── Email Delivery ───────────────────────────────────────────────────────────
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

// ─── HTML escaping ────────────────────────────────────────────────────────────

function esc(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ─── Email Templates ──────────────────────────────────────────────────────────

const APP = "redcore-Tuning";
const APP_URL = process.env.APP_URL ?? "https://redcoreos.net";
const SUPPORT_EMAIL = "support@redcoreos.net";
const LOGO_URL = `${APP_URL.replace(/\/$/, "")}/redcore-logo.png`;
const BRAND_COLOR = "#E8453C";
const BG = "#08090D";
const CARD_BG = "#11131A";
const BORDER = "#242734";
const TEXT = "#F4F6FA";
const MUTED = "#C0C7D6";
const CAPTION = "#8A93A8";

function emailWrapper(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:32px;background:${BG};font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;">
    <div style="padding:0 4px 16px;">
      <a href="${APP_URL}" style="display:inline-flex;align-items:center;gap:12px;text-decoration:none;color:${TEXT};">
        <img src="${LOGO_URL}" alt="redcore logo" width="42" height="42" style="display:block;border-radius:12px;" />
        <div>
          <div style="font-size:14px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${TEXT};">${APP}</div>
          <div style="font-size:12px;color:${CAPTION};line-height:1.4;">Transactional account mail</div>
        </div>
      </a>
    </div>
    <div style="background:linear-gradient(180deg,rgba(232,69,60,0.14),rgba(17,19,26,0.96) 32%);border-radius:24px;padding:1px;">
      <div style="background:${CARD_BG};border-radius:23px;padding:32px;border:1px solid ${BORDER};box-shadow:0 24px 60px rgba(0,0,0,0.28);">
        <div style="display:inline-block;margin:0 0 16px;padding:7px 12px;border:1px solid rgba(232,69,60,0.28);border-radius:999px;color:#ff98a0;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">Secure action</div>
        <h1 style="margin:0 0 10px;font-size:26px;line-height:1.2;font-weight:800;color:${TEXT};">${title}</h1>
        ${body}
      </div>
    </div>
    <div style="padding:18px 6px 0;color:${CAPTION};font-size:12px;line-height:1.6;text-align:center;">
      <div>Need help? <a href="mailto:${SUPPORT_EMAIL}" style="color:#ff98a0;text-decoration:none;">${SUPPORT_EMAIL}</a></div>
      <div style="margin-top:4px;">redcore Security Team · ${APP_URL.replace(/^https?:\/\//, "")}</div>
    </div>
  </div>
</body>
</html>`;
}

function primaryButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-flex;align-items:center;justify-content:center;margin:22px 0 0;background:linear-gradient(180deg,#ff5f54 0%,${BRAND_COLOR} 100%);color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:800;font-size:15px;box-shadow:0 10px 24px rgba(232,69,60,0.28);">${label}</a>`;
}

function caption(text: string): string {
  return `<p style="margin:18px 0 0;font-size:13px;color:${CAPTION};line-height:1.6;">${text}</p>`;
}

export function verifyEmailTemplate(name: string, link: string): string {
  const greeting = name ? `Hi ${esc(name)},` : "Hi,";
  return emailWrapper(
    "Verify your email",
    `<p style="color:${MUTED};margin:0 0 6px;font-size:15px;line-height:1.7;">${greeting}</p>
     <p style="color:${MUTED};margin:0;font-size:15px;line-height:1.7;">Confirm your ${APP} account to get started.</p>
     ${primaryButton(link, "Verify Email")}
     ${caption("Expires in 24 hours. If you didn't sign up, you can safely ignore this.")}`,
  );
}

export function resetPasswordTemplate(name: string, link: string): string {
  const greeting = name ? `Hi ${esc(name)},` : "Hi,";
  return emailWrapper(
    "Reset your password",
    `<p style="color:${MUTED};margin:0 0 6px;font-size:15px;line-height:1.7;">${greeting}</p>
     <p style="color:${MUTED};margin:0;font-size:15px;line-height:1.7;">Click below to choose a new ${APP} password.</p>
     ${primaryButton(link, "Reset Password")}
     ${caption("Expires in 1 hour. If you didn't request this, ignore this email — your password is unchanged.")}`,
  );
}

export function emailChangedTemplate(name: string, oldEmail: string): string {
  const greeting = name ? `Hi ${esc(name)},` : "Hi,";
  return emailWrapper(
    "Your email was changed",
    `<p style="color:${MUTED};margin:0 0 6px;font-size:15px;line-height:1.7;">${greeting}</p>
     <p style="color:${MUTED};margin:0;font-size:15px;line-height:1.7;">Your ${APP} account email was changed from <strong>${esc(oldEmail)}</strong>. If this wasn't you, contact support immediately.</p>`,
  );
}

export function welcomeTemplate(name: string): string {
  const greeting = name ? `Hi ${esc(name)},` : "Hi,";
  return emailWrapper(
    `Welcome to ${APP}`,
    `<p style="color:${MUTED};margin:0 0 6px;font-size:15px;line-height:1.7;">${greeting}</p>
     <p style="color:${MUTED};margin:0;font-size:15px;line-height:1.7;">Your account is ready. Download the app and start tuning.</p>`,
  );
}
