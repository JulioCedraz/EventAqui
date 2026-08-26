import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const userId = searchParams.get('state');

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://eventaqui.vercel.app';
  const redirectUri = `${baseUrl}/api/auth/mercadopago/callback`;

  if (!code || !userId) {
    return NextResponse.redirect(new URL('/profile?error=missing_mp_params', request.url));
  }

  try {
    const mpResponse = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        client_secret: process.env.MP_CLIENT_SECRET!,
        client_id: process.env.NEXT_PUBLIC_MP_APP_ID!,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      })
    });

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('Erro na resposta do Mercado Pago:', data);
      return NextResponse.redirect(new URL('/admin?error=mp_auth_failed', request.url));
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: dbError } = await supabaseAdmin
      .from('profiles')
      .update({
        mp_access_token: data.access_token,
        mp_refresh_token: data.refresh_token,
        mp_user_id: data.user_id.toString(),
        mp_public_key: data.public_key
      })
      .eq('id', userId);

    if (dbError) throw dbError;

    return NextResponse.redirect(new URL('/admin?success=mp_connected', request.url));
  } catch (error) {
    console.error('Erro interno na integração MP:', error);
    return NextResponse.redirect(new URL('/admin?error=internal_server_error', request.url));
  }
}