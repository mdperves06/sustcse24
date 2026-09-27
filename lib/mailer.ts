import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env, isProduction } from "@/lib/env";

type Mail = { to: string; subject: string; text: string; html?: string };

let transporter: Transporter | null = null;

export function isMailConfigured() {
  return Boolean(env.SMTP_HOST);
}

/**
 * Sends email through SMTP when configured. In development without SMTP the
 * message is printed to the server console so flows like password reset can be tested.
 */
export async function sendMail(mail: Mail): Promise<void> {
  if (!isMailConfigured()) {
    if (isProduction) {
      console.error("[mailer] SMTP is not configured; email to", mail.to, "was not sent.");
      return;
    }
    console.info(`\n[mailer:dev] To: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}\n`);
    return;
  }
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
  });
  await transporter.sendMail({ from: env.SMTP_FROM, ...mail });
}
