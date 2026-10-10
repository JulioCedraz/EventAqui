import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getRequestUser } from '@/lib/auth';
import { createOAuthState, OAUTH_STATE_COOKIE, OAUTH_STATE_MAX_AGE } from '@/lib/oauth-state';
import { SITE_URL } from '@/lib/site';

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'producer' && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Permissão insuficiente.' }, { status: 403 });
  }

  const { nonce, cookieValue } = createOAuthState(user.id);

  const authUrl = new URL('https://auth.mercadopago.com/authorization');
  authUrl.search = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_MP_APP_ID!,
    response_type: 'code',
    platform_id: 'mp',
    state: nonce,
    redirect_uri: `${SITE_URL}/api/auth/mercadopago/callback`,
  }).toString();

  const response = NextResponse.json({ url: authUrl.toString() });
  response.cookies.set(OAUTH_STATE_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/mercadopago',
    maxAge: OAUTH_STATE_MAX_AGE,
  });

  return response;
}
