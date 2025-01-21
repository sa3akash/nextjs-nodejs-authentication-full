import nodemailer from 'nodemailer';
import { config } from '@root/config';
import { ServerError } from 'error-express';

export const generateToken = (length: number) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    token += characters[randomIndex];
  }

  return token;
};

export const sendEmail = async (email: string, name: string, url: string) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465, // 587
    secure: true, // true for port 465, false for other ports
    auth: {
      user: config.SMS_EMAIL,
      pass: config.SMS_EMAIL_PASS
    }
  });

  try {
    await transporter.sendMail({
      from: `LMS 🔥 <${config.SMS_EMAIL}>`,
      to: email,
      subject: 'Email Verification Link',
      html: `
      <div style="display: flex; flex-direction: column; gap: 5px;">
      <span>${name}</span>
      <a href=${url} target="_blank"> link </a>
</div>
      
      `
    });
  } catch {
    throw new ServerError('Mail transport error:');
  }
};
