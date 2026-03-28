import nodemailer from "nodemailer";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

const APP_NAME = "redcore";
const BRAND_COLOR = "#E8254B";
const BG = "#0B0A0F";
const CARD_BG = "#14131A";
const BORDER = "#27242F";
const TEXT = "#F5F2FA";
const MUTED = "#B1A8C0";
const CAPTION = "#8A8198";

export async function sendEmail(opts: EmailOptions): Promise<void> {
  const fromEmail = process.env.EMAIL_FROM ?? "noreply@redcoreos.net";
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
<body style="margin:0;padding:32px;background:${BG};font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:${CARD_BG};border-radius:16px;padding:32px;border:1px solid ${BORDER};">
    <p style="margin:0 0 20px;font-size:13px;color:${CAPTION};font-weight:700;letter-spacing:.5px;text-transform:uppercase;">${APP_NAME}</p>
    <h1 style="margin:0 0 10px;font-size:24px;font-weight:700;color:${TEXT};">${title}</h1>
    ${body}
  </div>
</body>
</html>`;
}

function primaryButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;margin:20px 0 0;background:${BRAND_COLOR};color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">${label}</a>`;
}

function caption(text: string): string {
  return `<p style="margin:18px 0 0;font-size:13px;color:${CAPTION};line-height:1.5;">${text}</p>`;
}

export function resetPasswordTemplate(name: string | null, link: string): string {
  const greeting = name ? `Hi ${name},` : "Hi,";

  return emailWrapper(
    "Reset your password",
    `<p style="color:${MUTED};margin:0 0 6px;">${greeting}</p>
     <p style="color:${MUTED};margin:0;">Click below to choose a new ${APP_NAME} password.</p>
     ${primaryButton(link, "Reset Password")}
     ${caption("This link expires in 1 hour. If you did not request it, you can ignore this email and your password will stay the same.")}`,
  );
}
