import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

export const generateQrCodeUrl = (text: string) => {
  return `https://quickchart.io/qr?text=${text}&margin=2&size=300`;
};