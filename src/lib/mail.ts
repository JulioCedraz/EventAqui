import 'server-only';
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import { SITE_URL } from './site';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

const FROM = '"EventAqui" <eventaqui@gmail.com>';

// Todo dado vindo de usuário ou do banco passa por aqui antes de entrar no HTML.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const QR_CID = 'ingresso-qrcode';

// Imagem anexada ao e-mail (CID): o ID do ingresso não passa por terceiros
// e o QR aparece mesmo sem internet ou com imagens externas bloqueadas.
async function ticketQrAttachment(ticketId: string) {
  return {
    filename: 'ingresso-qrcode.png',
    content: await QRCode.toBuffer(ticketId, { margin: 2, width: 300 }),
    cid: QR_CID,
  };
}

function ticketCard(ticketId: string) {
  const id = escapeHtml(ticketId);
  return `
    <img src="cid:${QR_CID}" alt="QR Code do Ingresso" style="width: 250px; height: 250px; margin: 20px auto; border-radius: 8px; border: 1px solid #ddd;" />
    <p style="font-size: 12px; color: #888;">Código do ingresso (caso o leitor falhe):</p>
    <div style="background-color: #f3f4f6; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 14px; font-weight: bold; letter-spacing: 1px;">
      ${id}
    </div>`;
}

export async function sendTicketApprovedEmail(to: string, eventTitle: string, ticketId: string) {
  const title = escapeHtml(eventTitle);
  return transporter.sendMail({
    from: FROM,
    to,
    subject: `🎫 Seu ingresso para ${eventTitle} está garantido!`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; text-align: center; border: 1px solid #eaeaea; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #2563eb; padding: 30px; color: white;">
          <h1 style="margin: 0; font-size: 24px;">Ingresso Aprovado!</h1>
        </div>
        <div style="padding: 30px;">
          <p style="font-size: 16px;">Seu ingresso para <strong>${title}</strong> já está disponível.</p>
          <p style="font-size: 14px; color: #666;">Apresente o QR Code abaixo na portaria do evento:</p>
          ${ticketCard(ticketId)}
        </div>
      </div>`,
    attachments: [await ticketQrAttachment(ticketId)],
  });
}

export function sendGuestInviteEmail(to: string, guestName: string, eventTitle: string, magicLink: string) {
  const title = escapeHtml(eventTitle);
  const name = escapeHtml(guestName);
  const link = escapeHtml(magicLink);
  return transporter.sendMail({
    from: FROM,
    to,
    subject: `🎁 Você ganhou um ingresso para ${eventTitle}!`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; text-align: center; border: 1px solid #eaeaea; border-radius: 12px;">
        <div style="padding: 30px;">
          <h2 style="color: #2563eb;">Olá, ${name}!</h2>
          <p>Você acaba de ganhar um ingresso <strong>Casadinha</strong> para <strong>${title}</strong>.</p>
          <p>Para emitir o seu QR Code oficial no seu nome, vincule este ingresso ao seu perfil gratuitamente clicando abaixo:</p>
          <a href="${link}" style="display: inline-block; background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">
            Resgatar Meu Ingresso
          </a>
          <p style="font-size: 12px; color: #888;">Link alternativo: <br/> ${link}</p>
        </div>
      </div>`,
  });
}

export async function sendGuestClaimedEmail(to: string, name: string, eventTitle: string, ticketId: string) {
  const title = escapeHtml(eventTitle);
  return transporter.sendMail({
    from: FROM,
    to,
    subject: `✅ Seu ingresso para ${eventTitle} foi resgatado!`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; text-align: center; border: 1px solid #eaeaea; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #10b981; padding: 30px; color: white;">
          <h1 style="margin: 0; font-size: 24px;">Ingresso Resgatado!</h1>
        </div>
        <div style="padding: 30px; color: #333;">
          <p style="font-size: 16px;">Tudo certo, <strong>${escapeHtml(name)}</strong>!</p>
          <p>Seu ingresso para <strong>${title}</strong> já está no seu nome.</p>
          ${ticketCard(ticketId)}
        </div>
      </div>`,
    attachments: [await ticketQrAttachment(ticketId)],
  });
}

export function sendAccountDeletionCodeEmail(to: string, code: string) {
  return transporter.sendMail({
    from: FROM,
    to,
    subject: 'Código para excluir sua conta EventAqui',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; text-align: center; border: 1px solid #eaeaea; border-radius: 12px;">
        <div style="padding: 30px;">
          <h2 style="color: #dc2626;">Exclusão de conta</h2>
          <p>Use o código abaixo para confirmar a exclusão da sua conta. Ele vale por 10 minutos.</p>
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; font-family: monospace; font-size: 28px; font-weight: bold; letter-spacing: 6px; margin: 20px 0;">
            ${escapeHtml(code)}
          </div>
          <p style="font-size: 13px; color: #888;">Se você não pediu a exclusão, ignore este e-mail e troque sua senha.</p>
        </div>
      </div>`,
  });
}

export function sendAccountDeletionScheduledEmail(to: string, deletionDate: Date) {
  const date = deletionDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const link = escapeHtml(`${SITE_URL}/login`);
  return transporter.sendMail({
    from: FROM,
    to,
    subject: 'Sua conta EventAqui foi agendada para exclusão',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; text-align: center; border: 1px solid #eaeaea; border-radius: 12px;">
        <div style="padding: 30px;">
          <h2 style="color: #dc2626;">Exclusão agendada</h2>
          <p>Sua conta será excluída definitivamente em <strong>${date}</strong>.</p>
          <p>Até lá, basta entrar na sua conta para reativá-la.</p>
          <p><strong>Se não foi você</strong>, entre agora e troque sua senha:</p>
          <a href="${link}" style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">
            Entrar e reativar
          </a>
        </div>
      </div>`,
  });
}

type ManualRefundDetails = { eventTitle: string; ticketId: string; buyerName: string; buyerEmail: string; reason: string };

export function sendManualRefundEmail(to: string, details: ManualRefundDetails) {
  const title = escapeHtml(details.eventTitle);
  return transporter.sendMail({
    from: FROM,
    to,
    subject: `Estorno necessário: pagamento sem ingresso em ${details.eventTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #eaeaea; border-radius: 12px;">
        <div style="padding: 30px;">
          <h2 style="color: #dc2626;">Estorno necessário</h2>
          <p>Recebemos um pagamento para <strong>${title}</strong> que não pôde virar ingresso: ${escapeHtml(details.reason)}</p>
          <p>Faça o estorno pelo seu gateway de pagamento. A EventAqui não estorna automaticamente.</p>
          <ul style="line-height: 1.6;">
            <li>Comprador: <strong>${escapeHtml(details.buyerName)}</strong> (${escapeHtml(details.buyerEmail)})</li>
            <li>Pedido: <code>${escapeHtml(details.ticketId)}</code></li>
          </ul>
        </div>
      </div>`,
  });
}
