import nodemailer from "nodemailer";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

const APP_NAME = "redcore";
const APP_URL = process.env.APP_URL ?? "https://redcoreos.net";
const SUPPORT_EMAIL = "support@redcoreos.net";
const LOGO_URL = `${APP_URL.replace(/\/$/, "")}/redcore-logo.png`;
const BRAND_COLOR = "#E8254B";
const BG = "#0B0A0F";
const CARD_BG = "#14131A";
const BORDER = "#27242F";
const TEXT = "#F5F2FA";
const MUTED = "#B1A8C0";
const CAPTION = "#8A8198";

function esc(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

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
  <div style="max-width:560px;margin:0 auto;">
    <div style="padding:0 4px 16px;">
      <a href="${APP_URL}" style="display:inline-flex;align-items:center;gap:12px;text-decoration:none;color:${TEXT};">
        <img src="${LOGO_URL}" alt="redcore logo" width="42" height="42" style="display:block;border-radius:12px;" />
        <div>
          <div style="font-size:14px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${TEXT};">${APP_NAME}</div>
          <div style="font-size:12px;color:${CAPTION};line-height:1.4;">Transactional account mail</div>
        </div>
      </a>
    </div>
    <div style="background:linear-gradient(180deg,rgba(232,37,75,0.14),rgba(20,19,26,0.96) 32%);border-radius:24px;padding:1px;">
      <div style="background:${CARD_BG};border-radius:23px;padding:32px;border:1px solid ${BORDER};box-shadow:0 24px 60px rgba(0,0,0,0.28);">
        <div style="display:inline-block;margin:0 0 16px;padding:7px 12px;border:1px solid rgba(232,37,75,0.28);border-radius:999px;color:#ff8da0;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">Secure action</div>
        <h1 style="margin:0 0 10px;font-size:26px;line-height:1.2;font-weight:800;color:${TEXT};">${title}</h1>
        ${body}
      </div>
    </div>
    <div style="padding:18px 6px 0;color:${CAPTION};font-size:12px;line-height:1.6;text-align:center;">
      <div>Need help? <a href="mailto:${SUPPORT_EMAIL}" style="color:#ff8da0;text-decoration:none;">${SUPPORT_EMAIL}</a></div>
      <div style="margin-top:4px;">redcore Security Team · ${APP_URL.replace(/^https?:\/\//, "")}</div>
    </div>
  </div>
</body>
</html>`;
}

function primaryButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-flex;align-items:center;justify-content:center;margin:22px 0 0;background:linear-gradient(180deg,#ff5d78 0%,${BRAND_COLOR} 100%);color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:800;font-size:15px;box-shadow:0 10px 24px rgba(232,37,75,0.28);">${label}</a>`;
}

function caption(text: string): string {
  return `<p style="margin:18px 0 0;font-size:13px;color:${CAPTION};line-height:1.6;">${text}</p>`;
}

export function resetPasswordTemplate(name: string | null, link: string): string {
  const greeting = name ? `Hi ${esc(name)},` : "Hi,";

  return emailWrapper(
    "Reset your password",
    `<p style="color:${MUTED};margin:0 0 6px;font-size:15px;line-height:1.7;">${greeting}</p>
     <p style="color:${MUTED};margin:0;font-size:15px;line-height:1.7;">Click below to choose a new ${APP_NAME} password.</p>
     ${primaryButton(link, "Reset Password")}
     ${caption("This link expires in 1 hour. If you did not request it, you can ignore this email and your password will stay the same.")}`,
  );
}
