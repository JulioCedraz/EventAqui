import 'server-only';
import crypto from 'crypto';

// Vincula o "state" do OAuth do Mercado Pago ao usuário que iniciou o fluxo.
// O cookie guarda "userId.nonce.assinatura"; o Mercado Pago devolve só o nonce.
export const OAUTH_STATE_COOKIE = 'mp_oauth_state';
export const OAUTH_STATE_MAX_AGE = 10 * 60;

const sign = (payload: string) =>
  crypto.createHmac('sha256', process.env.MP_CLIENT_SECRET!).update(payload).digest('base64url');

export function createOAuthState(userId: string) {
  const nonce = crypto.randomBytes(32).toString('base64url');
  const payload = `${userId}.${nonce}`;
  return { nonce, cookieValue: `${payload}.${sign(payload)}` };
}

// Retorna o userId quando o cookie é autêntico e corresponde ao state recebido.
export function verifyOAuthState(cookieValue: string | undefined, state: string | null): string | null {
  if (!cookieValue || !state) return null;

  const [userId, nonce, signature] = cookieValue.split('.');
  if (!userId || !nonce || !signature) return null;

  const expected = Buffer.from(sign(`${userId}.${nonce}`));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return null;

  const stateMatches = Buffer.from(nonce).length === Buffer.from(state).length
    && crypto.timingSafeEqual(Buffer.from(nonce), Buffer.from(state));

  return stateMatches ? userId : null;
}
