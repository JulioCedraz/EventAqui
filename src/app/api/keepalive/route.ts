import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Chamada diária do Vercel Cron: uma consulta real impede que o Supabase pause o projeto por inatividade.
// A Vercel envia "Authorization: Bearer <CRON_SECRET>"; sem o segredo configurado, a rota recusa tudo.
function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(request.headers.get('authorization') ?? '');
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ ok: false }, { status: 401 });

  const { error } = await supabaseAdmin.from('events').select('id').limit(1);

  if (error) {
    console.error('Keepalive falhou ao consultar o Supabase:', error);
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
