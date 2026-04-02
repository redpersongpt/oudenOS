import nodemailer from "nodemailer";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

const APP_NAME = "Ouden";
const SUPPORT_EMAIL = "support@ouden.cc";
const BRAND_COLOR = "#D71921";
const BG = "#000000";
const CARD_BG = "#0D0D0D";
const BORDER = "#1C1C1C";
const TEXT = "#F5F5F5";
const MUTED = "#A0A0A8";
const CAPTION = "#606068";

function esc(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function sendEmail(opts: EmailOptions): Promise<void> {
  const fromEmail = process.env.EMAIL_FROM ?? "noreply@ouden.cc";
  const fromName = process.env.EMAIL_FROM_NAME ?? APP_NAME;
  const canUseSendGrid = Boolean(process.env.SENDGRID_API_KEY);
  const canUseSendmail = process.env.SENDMAIL_ENABLED !== "false";

  if (canUseSendGrid) {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: opts.to }] }],
        from: {
          email: fromEmail,
          name: fromName,
        },
        subject: opts.subject,
        content: [{ type: "text/html", value: opts.html }],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "(no body)");
      throw new Error(`SendGrid delivery failed (${res.status}): ${body}`);
    }
    console.info("[email] delivered via SendGrid", { to: opts.to, subject: opts.subject });
    return;
  }

  if (canUseSendmail) {
    const transporter = nodemailer.createTransport({
      sendmail: true,
      newline: "unix",
      path: process.env.SENDMAIL_BIN ?? "/usr/sbin/sendmail",
    });

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    console.info("[email] delivered via sendmail", { to: opts.to, subject: opts.subject });
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

function emailWrapper(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:32px;background:${BG};font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:620px;margin:0 auto;">
    <div style="padding:0 6px 16px;font-size:14px;font-weight:700;letter-spacing:.1em;text-transform:lowercase;color:${TEXT};">ouden<span style="color:#D71921;">.cc</span></div>
    <div style="background:linear-gradient(180deg,rgba(215,25,33,0.18),rgba(13,13,13,0.98) 30%);border-radius:20px;padding:1px;">
      <div style="background:${CARD_BG};border-radius:19px;padding:34px;border:1px solid ${BORDER};box-shadow:0 28px 80px rgba(0,0,0,0.60);">
        <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;font-weight:800;letter-spacing:-0.03em;color:${TEXT};">${title}</h1>
        ${body}
      </div>
    </div>
    <div style="padding:18px 8px 0;color:${CAPTION};font-size:12px;line-height:1.6;text-align:center;">
      <div>Need help? <a href="mailto:${SUPPORT_EMAIL}" style="color:#ff8da0;text-decoration:none;">${SUPPORT_EMAIL}</a></div>
    </div>
  </div>
</body>
</html>`;
}

function primaryButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-flex;align-items:center;justify-content:center;margin:24px 0 0;background:${BRAND_COLOR};color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:.01em;box-shadow:0 8px 20px rgba(215,25,33,0.28);">${label}</a>`;
}

function caption(text: string): string {
  return `<p style="margin:18px 0 0;font-size:13px;color:${CAPTION};line-height:1.6;">${text}</p>`;
}

function bodyCopy(content: string): string {
  return `<div style="color:${MUTED};font-size:15px;line-height:1.75;">${content}</div>`;
}

export function resetPasswordTemplate(name: string | null, link: string): string {
  return emailWrapper(
    "Password reset",
    bodyCopy(
      `<p style="margin:0;">${name ? `Hi ${esc(name)},` : "Hi,"}</p>
       <p style="margin:10px 0 0;">Use the button below to set a new password for your Ouden account.</p>
       ${primaryButton(link, "Reset password")}
       ${caption("This link expires in 1 hour.")}`,
    ),
  );
}
