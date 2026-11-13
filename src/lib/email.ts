import "server-only";
import { SITE_NAME, SITE_URL } from "./site";

type Mail = { to: string; subject: string; heading: string; lines: string[]; cta?: { label: string; path: string } };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function render({ heading, lines, cta }: Mail) {
  return `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
  <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #e2e8f0;border-radius:12px">
  <tr><td style="padding:28px 32px">
    <p style="margin:0 0 20px;font-size:20px;font-weight:bold;color:#047857">${SITE_NAME}</p>
    <h1 style="margin:0 0 16px;font-size:20px">${esc(heading)}</h1>
    ${lines.map((l) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#334155">${esc(l)}</p>`).join("")}
    ${cta ? `<p style="margin:24px 0 0"><a href="${SITE_URL}${cta.path}" style="display:inline-block;background:#047857;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:bold">${esc(cta.label)}</a></p>` : ""}
  </td></tr></table>
  <p style="font-size:12px;color:#94a3b8;margin-top:16px">You received this because you have an account on ${SITE_NAME}.</p>
  </td></tr></table></body></html>`;
}

/**
 * Sends a transactional email through Resend (https://resend.com).
 * Without RESEND_API_KEY it only logs, so local development and previews never send real mail.
 * Never throws: a failed email must not break the action that triggered it.
 */
export async function sendEmail(mail: Mail) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email skipped: no RESEND_API_KEY] to=${mail.to} subject="${mail.subject}"`);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || `${SITE_NAME} <onboarding@resend.dev>`,
        to: [mail.to],
        subject: mail.subject,
        html: render(mail),
        text: [mail.heading, "", ...mail.lines, ...(mail.cta ? ["", `${mail.cta.label}: ${SITE_URL}${mail.cta.path}`] : [])].join("\n"),
      }),
    });
    if (!res.ok) console.error(`[email failed] ${res.status} ${await res.text()}`);
  } catch (e) {
    console.error("[email failed]", e);
  }
}
