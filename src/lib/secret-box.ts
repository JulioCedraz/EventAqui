import 'server-only';
import crypto from 'crypto';

// Criptografa segredos de produtores (API Key do gateway) antes de gravar no banco.
// Formato salvo: "v1.iv.tag.ciphertext", em base64url. AES-256-GCM detecta adulteração.
const VERSION = 'v1';

function getKey() {
  const key = Buffer.from(process.env.PAYMENT_KEY_SECRET ?? '', 'base64');
  if (key.length !== 32) throw new Error('PAYMENT_KEY_SECRET ausente ou inválida (esperado: 32 bytes em base64).');
  return key;
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

  return [VERSION, iv, cipher.getAuthTag(), ciphertext]
    .map((part) => (typeof part === 'string' ? part : part.toString('base64url')))
    .join('.');
}

// Retorna null quando o valor está corrompido ou foi cifrado com outra chave.
export function decryptSecret(sealed: string): string | null {
  const [version, iv, tag, ciphertext] = sealed.split('.');
  if (version !== VERSION || !iv || !tag || !ciphertext) return null;

  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}
