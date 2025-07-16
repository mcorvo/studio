// lib/email.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '25', 10),
  secure: process.env.SMTP_SECURE === 'false', // true for 465, false for 587
  /*auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },*/
});

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      html,
    });

    console.log(`✅ Email sent: ${info.messageId}`);
  } catch (err) {
    console.error('❌ Failed to send email via SMTP:', err);
    throw err;
  }
}

