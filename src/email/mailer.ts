/**
 * Resend email sender.
 *
 * Required env vars:
 *   RESEND_API_KEY  — from resend.com
 *   EMAIL_TO        — your personal inbox, e.g. you@gmail.com
 *   EMAIL_FROM      — a verified Resend sender, e.g. career@yourdomain.com
 */
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailPayload {
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const to = process.env.EMAIL_TO;
  const from = process.env.EMAIL_FROM;

  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping email");
    return;
  }
  if (!to || !from) {
    console.warn("[email] EMAIL_TO / EMAIL_FROM not set — skipping email");
    return;
  }

  const { error } = await resend.emails.send({
    from,
    to,
    subject: payload.subject,
    html: payload.html,
  });

  if (error) {
    console.warn("[email] Resend error:", error.message);
  }
}
