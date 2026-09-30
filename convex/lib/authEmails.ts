// Sign-in emails sent through Resend (convex/emails.ts). Plain, inline-styled HTML with a
// text copy, since mail clients ignore stylesheets.

export type AuthEmail = { subject: string; html: string; text: string };

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout({ greeting, body, action, url, footer }: {
  greeting: string; body: string; action: string; url: string; footer: string;
}) {
  const href = escapeHtml(url);
  return `<!doctype html>
<html><body style="margin:0;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1917">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px">
<tr><td>
<p style="margin:0 0 24px;font-size:20px;font-weight:600">Payspace</p>
<p style="margin:0 0 12px;font-size:16px">${escapeHtml(greeting)}</p>
<p style="margin:0 0 24px;font-size:16px;line-height:1.5">${escapeHtml(body)}</p>
<a href="${href}" style="display:inline-block;background:#ff6a13;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">${escapeHtml(action)}</a>
<p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#57534e">If the button doesn't work, paste this link into your browser:<br><a href="${href}" style="color:#57534e;word-break:break-all">${href}</a></p>
<p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#57534e">${escapeHtml(footer)}</p>
</td></tr></table>
</td></tr></table>
</body></html>`;
}

function greet(name: string) {
  const first = name.trim().split(/\s+/)[0];
  return first ? `Hi ${first},` : "Hi,";
}

export function verifyEmail(name: string, url: string): AuthEmail {
  const greeting = greet(name);
  const body = "Confirm your email address to finish creating your Payspace account.";
  const footer = "The link works for 24 hours. If you didn't sign up for Payspace, you can ignore this email.";
  return {
    subject: "Confirm your email for Payspace",
    html: layout({ greeting, body, action: "Confirm email", url, footer }),
    text: `${greeting}\n\n${body}\n\n${url}\n\n${footer}\n`,
  };
}

export function resetPassword(name: string, url: string): AuthEmail {
  const greeting = greet(name);
  const body = "We got a request to reset your Payspace password. Choose a new one with the button below.";
  const footer = "The link works for 1 hour. If you didn't ask for this, you can ignore this email; your password stays the same.";
  return {
    subject: "Reset your Payspace password",
    html: layout({ greeting, body, action: "Reset password", url, footer }),
    text: `${greeting}\n\n${body}\n\n${url}\n\n${footer}\n`,
  };
}
