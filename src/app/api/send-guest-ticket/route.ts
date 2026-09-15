import { NextResponse } from 'next/server';
import { transporter, generateQrCodeUrl } from '@/lib/mail';

export async function POST(request: Request) {
  try {
    const { email, name, eventTitle, newTicketId } = await request.json();
    const qrUrl = generateQrCodeUrl(newTicketId);

    const mailOptions = {
      from: '"EventAqui" <eventaqui@gmail.com>',
      to: email,
      subject: `✅ Seu ingresso para ${eventTitle} foi resgatado!`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; text-align: center; border: 1px solid #eaeaea; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #10b981; padding: 30px; color: white;">
            <h1 style="margin: 0; font-size: 24px;">Ingresso Resgatado!</h1>
          </div>
          <div style="padding: 30px; color: #333;">
            <p style="font-size: 16px;">Tudo certo, <strong>${name}</strong>!</p>
            <p>Seu ingresso para <strong>${eventTitle}</strong> já está no seu nome.</p>
            
            <img src="${qrUrl}" alt="Seu QR Code" style="width: 250px; height: 250px; margin: 20px auto; border-radius: 8px; border: 1px solid #ddd;" />
            
            <p style="font-size: 12px; color: #888;">Código do ingresso:</p>
            <div style="background-color: #f3f4f6; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 14px; font-weight: bold; letter-spacing: 1px;">
              ${newTicketId}
            </div>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Falha ao enviar' }, { status: 500 });
  }
}